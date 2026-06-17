export async function parseJSON(jsonString: string): Promise<unknown> {
  return await Promise.resolve(JSON.parse(jsonString));
}
