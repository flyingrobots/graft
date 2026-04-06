# Add Markdown summary support

README files and docs are high-frequency agent reads. Markdown has real
structure - heading hierarchy, sections, and bounded ranges - even
though it is not code. Graft should be able to summarize that structure
honestly instead of falling back to empty code outlines or raw reads.

What this might look like:
- Treat `.md` as a supported structured document format
- Extract heading-based outlines with section ranges
- Return jump-table entries that make `read_range` useful for docs
- Preserve lawful degrade for formats that still have no explicit
  extractor

Question to answer in design:
- Does Markdown reuse the existing outline shape with a new `heading`
  kind, or does Graft need a document-outline variant?

Effort: M
