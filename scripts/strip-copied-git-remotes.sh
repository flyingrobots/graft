#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "usage: strip-copied-git-remotes.sh <copied-source-root>" >&2
  exit 2
fi

copied_root=$1
if [ ! -d "$copied_root" ]; then
  echo "copied source root is not a directory: $copied_root" >&2
  exit 2
fi

# A copied linked-worktree pointer can retain an absolute path to checkout Git
# metadata. It is never useful in the image, so sever it before inspecting real
# Git directories.
find "$copied_root" -name .git \( -type f -o -type l \) -exec rm -f -- {} +

# Scrub ordinary .git directories and copied bare repositories. The root
# checkout's .git is already excluded by .dockerignore; this covers nested
# repositories that may be added to the build context later.
find "$copied_root" -type d \( -name .git -o -name '*.git' \) -exec sh -eu -c '
  for git_dir do
    if ! GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1 \
      git --git-dir="$git_dir" rev-parse --git-dir >/dev/null 2>&1
    then
      continue
    fi

    GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1 \
      git --git-dir="$git_dir" remote |
      while IFS= read -r remote_name; do
        if [ -n "$remote_name" ]; then
          GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1 \
            git --git-dir="$git_dir" remote remove "$remote_name"
        fi
      done

    remaining=$(GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1 \
      git --git-dir="$git_dir" remote)
    if [ -n "$remaining" ]; then
      echo "copied Git repository still has remotes after scrub: $git_dir" >&2
      exit 1
    fi
  done
' sh {} +

if find "$copied_root" -name .git \( -type f -o -type l \) -print -quit | grep -q .; then
  echo "copied Git worktree pointer survived scrub" >&2
  exit 1
fi

echo "copy-in Git scrub complete: no copied repository remotes or worktree pointers"
