import { Edge } from './models';

export function buildGraphFromEdges(edges: Edge[]) {
  const lines: string[] = ['digraph G {'];

  for (const edge of edges) {
    lines.push(renderEdge(edge));
  }

  lines.push('}');
  return lines.join('\n');
}

export function buildBigraphFromEdges(leftEdges: Edge[], rightEdges: Edge[], crossEdges: Edge[]) {
  const lines: string[] = ['digraph G {'];

  // Left Cluster
  lines.push('  subgraph cluster_left {');
  lines.push('    color=blue');
  for (const edge of leftEdges) {
    lines.push(renderEdge(edge, '    '));
  }
  lines.push('  }');

  // Left Cluster
  lines.push('  subgraph cluster_right {');
  lines.push('    color=blue');
  for (const edge of rightEdges) {
    lines.push(renderEdge(edge, '    '));
  }
  lines.push('  }');

  for (const edge of crossEdges) {
    lines.push(renderEdge(edge));
  }

  lines.push('}');
  return lines.join('\n');
}

function renderEdge(edge: Edge, indent: string = '  ') {

  const color = edge.isChange ? 'color = "coral"' : '';

  return `${indent}"${edge.source.address}" -> "${edge.target.address}" [ label = "${edge.transaction.hash}" ${color} labelURL= "http://${edge.transaction.hash}"]`;
}
