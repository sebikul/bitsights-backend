import { Edge } from './models';

export function buildGraphFromEdges(edges: Edge[]) {
  const lines: string[] = ['digraph G {'];

  for (const edge of edges) {
    lines.push(`  "${edge.source.address}" -> "${edge.target.address}" [ label = "${edge.transaction.hash}" ]`);
  }

  lines.push('}');
  return lines.join('\n');
}
