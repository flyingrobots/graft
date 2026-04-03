// Audit fixture: Express-style router with many handler exports
// Tests: arrow function handlers, middleware functions, route params

import type { Request, Response, NextFunction } from "express";

export interface RouteParams {
  id: string;
  slug?: string;
}

export type HandlerFn = (req: Request, res: Response) => Promise<void>;

// Middleware (regular functions)
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  if (!req.headers.authorization) throw new Error("Unauthorized");
  next();
}

export function rateLimit(maxRequests: number): (req: Request, res: Response, next: NextFunction) => void {
  const counts = new Map<string, number>();
  return (req, res, next) => {
    const ip = req.ip ?? "unknown";
    const current = counts.get(ip) ?? 0;
    if (current >= maxRequests) { res.status(429).end(); return; }
    counts.set(ip, current + 1);
    next();
  };
}

// Route handlers (arrow function exports)
export const listUsers = async (_req: Request, res: Response): Promise<void> => {
  res.json({ users: [] });
};

export const getUser = async (req: Request, res: Response): Promise<void> => {
  res.json({ id: req.params["id"] });
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  res.status(201).json(req.body);
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  res.json({ id: req.params["id"], ...req.body });
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  res.status(204).end();
};

export const listPosts = async (_req: Request, res: Response): Promise<void> => {
  res.json({ posts: [] });
};

export const getPost = async (req: Request, res: Response): Promise<void> => {
  res.json({ id: req.params["id"] });
};

export const createPost = async (req: Request, res: Response): Promise<void> => {
  res.status(201).json(req.body);
};

export const updatePost = async (req: Request, res: Response): Promise<void> => {
  res.json({ id: req.params["id"], ...req.body });
};

export const deletePost = async (req: Request, res: Response): Promise<void> => {
  res.status(204).end();
};

export const listComments = async (_req: Request, res: Response): Promise<void> => {
  res.json({ comments: [] });
};

export const getComment = async (req: Request, res: Response): Promise<void> => {
  res.json({ id: req.params["id"] });
};

export const createComment = async (req: Request, res: Response): Promise<void> => {
  res.status(201).json(req.body);
};

export const searchUsers = async (req: Request, res: Response): Promise<void> => {
  const query = req.query["q"] ?? "";
  res.json({ query, results: [] });
};

export const healthCheck = async (_req: Request, res: Response): Promise<void> => {
  res.json({ status: "ok" });
};
