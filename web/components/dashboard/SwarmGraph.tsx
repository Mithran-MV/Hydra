"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { HeadState } from "@shared/types";

interface Props {
  heads: HeadState[];
  scarsCount: number;
}

const STATUS_COLOR: Record<string, string> = {
  healthy: "#37ff9e",
  booting: "#a3a3a3",
  suspected: "#ffb347",
  resurrecting: "#60a5fa",
  newborn: "#c084fc",
  dead: "#ff2d55",
};

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  state: HeadState;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  kind: "mesh" | "lineage";
}

export function SwarmGraph({ heads, scarsCount }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth || 800;
    const height = svgRef.current.clientHeight || 400;

    svg.selectAll("*").remove();

    const nodes: GraphNode[] = heads.map((h) => ({ id: h.id, state: h }));

    // Mesh edges: every alive head connects to every other (it's a full mesh)
    const meshLinks: GraphLink[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        meshLinks.push({
          source: nodes[i].id,
          target: nodes[j].id,
          kind: "mesh",
        });
      }
    }
    // Lineage edges: child → parent
    const lineageLinks: GraphLink[] = nodes
      .filter((n) => n.state.parent && nodes.some((p) => p.id === n.state.parent))
      .map((n) => ({
        source: n.state.parent as string,
        target: n.id,
        kind: "lineage" as const,
      }));
    const links = [...meshLinks, ...lineageLinks];

    const sim = d3
      .forceSimulation<GraphNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.id)
          .distance((l) => (l.kind === "lineage" ? 90 : 140))
          .strength((l) => (l.kind === "lineage" ? 0.7 : 0.2)),
      )
      .force("charge", d3.forceManyBody().strength(-380))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide(38));
    simRef.current = sim;

    const g = svg.append("g");

    // Mesh edges (dashed teal)
    const meshSel = g
      .append("g")
      .attr("stroke", "#37ff9e")
      .attr("stroke-opacity", 0.18)
      .attr("stroke-dasharray", "4 6")
      .selectAll("line")
      .data(meshLinks)
      .join("line")
      .attr("stroke-width", 1);

    // Lineage edges (solid red — "this child came from that parent")
    const lineageSel = g
      .append("g")
      .attr("stroke", "#ff2d55")
      .attr("stroke-opacity", 0.55)
      .selectAll("line")
      .data(lineageLinks)
      .join("line")
      .attr("stroke-width", 1.5);

    const node = g
      .append("g")
      .selectAll<SVGGElement, GraphNode>("g")
      .data(nodes)
      .join("g")
      .style("cursor", "pointer");

    node
      .append("circle")
      .attr("r", 22)
      .attr("fill", "#05060a")
      .attr("stroke", (d) => STATUS_COLOR[d.state.status] ?? "#888")
      .attr("stroke-width", 2);

    node
      .append("circle")
      .attr("r", 5)
      .attr("fill", (d) => STATUS_COLOR[d.state.status] ?? "#888")
      .attr("opacity", 0.85);

    node
      .append("text")
      .text((d) => d.id.slice(0, 6))
      .attr("text-anchor", "middle")
      .attr("dy", 38)
      .attr("font-family", "ui-monospace, SFMono-Regular, monospace")
      .attr("font-size", 10)
      .attr("fill", "#a3a3a3");

    node
      .append("text")
      .text((d) => `gen ${d.state.generation}`)
      .attr("text-anchor", "middle")
      .attr("dy", 50)
      .attr("font-family", "ui-monospace, SFMono-Regular, monospace")
      .attr("font-size", 9)
      .attr("fill", "#737373");

    sim.on("tick", () => {
      meshSel
        .attr("x1", (d) => (d.source as GraphNode).x ?? 0)
        .attr("y1", (d) => (d.source as GraphNode).y ?? 0)
        .attr("x2", (d) => (d.target as GraphNode).x ?? 0)
        .attr("y2", (d) => (d.target as GraphNode).y ?? 0);
      lineageSel
        .attr("x1", (d) => (d.source as GraphNode).x ?? 0)
        .attr("y1", (d) => (d.source as GraphNode).y ?? 0)
        .attr("x2", (d) => (d.target as GraphNode).x ?? 0)
        .attr("y2", (d) => (d.target as GraphNode).y ?? 0);
      node.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => {
      sim.stop();
    };
  }, [heads]);

  return (
    <div className="relative w-full h-full">
      <svg ref={svgRef} className="w-full h-full" />
      <div className="absolute bottom-3 left-3 font-mono text-[0.65rem] text-neutral-600 leading-snug">
        <div>{heads.length} nodes · {scarsCount} scars</div>
        <div className="mt-1 flex gap-3">
          <span>
            <span className="inline-block w-2 h-2 rounded-full bg-venom-400 mr-1" />
            healthy
          </span>
          <span>
            <span className="inline-block w-2 h-2 rounded-full bg-purple-400 mr-1" />
            newborn
          </span>
          <span>
            <span className="inline-block w-3 h-px bg-blood-500 align-middle mr-1" />
            lineage
          </span>
        </div>
      </div>
    </div>
  );
}
