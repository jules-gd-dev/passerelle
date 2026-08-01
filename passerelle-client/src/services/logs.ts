export const logBuffers = new Map<string, string[]>();

export function appendLogLine(serviceId: string, text: string) {
  const cleanLine = text.trim();
  if (!cleanLine) return;
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const timestamp = `[${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}]`;
  const formattedLine = `${timestamp} ${cleanLine}`;

  const current = logBuffers.get(serviceId) || [];
  current.push(formattedLine);
  if (current.length > 100) {
    current.splice(0, current.length - 100);
  }
  logBuffers.set(serviceId, current);
}
