import type { AuthRequest } from '../common/http';

export async function startSession(req: AuthRequest, id: string) {
  await new Promise<void>((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
  req.session.userId = id;
  await new Promise<void>((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
}
