import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { Plus, Minus, RefreshCw, Locate } from 'lucide-react';
import './network-graph.css';
import config from './config';

import {
    Simulation,
    SimulationNodeDatum,
    SimulationLinkDatum,
    D3DragEvent,
} from 'd3';

/**
 * Props for the NetworkGraph component.
 * @property nodeData - Object mapping node IDs to their values.
 * @property edgeData - Array of edge data.
 */
interface NetworkGraphProps {
    nodeData: { [key: string]: number };
    edgeData: EdgeData[];
}

/**
 * Represents the data for an edge/link in the graph.
 */
interface EdgeData {
    source: string;
    target: string;
    value: number;
}

/**
 * Represents a node in the graph.
 */
interface Node extends SimulationNodeDatum {
    id: string;
    originalName: string;
    group: string;
    value: number;
    visible: boolean;
}

/**
 * Represents a link between two nodes in the graph.
 */
interface Link extends SimulationLinkDatum<Node> {
    source: string | Node;
    target: string | Node;
    value: number;
}

const NetworkGraph: React.FC<NetworkGraphProps> = ({ nodeData, edgeData }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
    const [currentFilter, setCurrentFilter] = useState<string>('all');
    const [nodesArray, setNodesArray] = useState<Node[]>([]);
    const [linksArray, setLinksArray] = useState<Link[]>([]);
    const [simulation, setSimulation] = useState<Simulation<Node, Link> | null>(null);

    /**
     * Determines if a link should be visible based on the current filter.
     * @param link - The link to check.
     * @returns True if the link is visible, false otherwise.
     */
    const isLinkVisible = useCallback(
        (link: Link): boolean => {
            return (
                currentFilter === 'all' ||
                (currentFilter === 'positive' && link.value >= 0) ||
                (currentFilter === 'negative' && link.value < 0)
            );
        },
        [currentFilter]
    );

    /**
     * Toggles the visibility of a node.
     * @param clickedNode - The node to update.
     */
    const updateNodeVisibility = useCallback((clickedNode: Node) => {
        clickedNode.visible = !clickedNode.visible;
        // Update React state to trigger re-render of legend
        setNodesArray((prevNodes) => [...prevNodes]);
    }, []);

    // Selects all nodes and updates their visibility.
    
    const selectAll = useCallback(() => {
        const svg = d3.select(svgRef.current);

        // Update nodes
        svg.selectAll<SVGCircleElement, Node>('.node').each((d) => {
            d.visible = true;
        });

        // Update labels
        svg.selectAll<SVGTextElement, Node>('.node-label').each((d) => {
            d.visible = true;
        });

        // Update React state to trigger re-render of legend
        setNodesArray((prevNodes) => [...prevNodes]);
    }, []);

    // Deselects all nodes and updates their visibility.

    const selectNone = useCallback(() => {
        const svg = d3.select(svgRef.current);

        // Update nodes
        svg.selectAll<SVGCircleElement, Node>('.node').each((d) => {
            d.visible = false;
        });

        // Update labels
        svg.selectAll<SVGTextElement, Node>('.node-label').each((d) => {
            d.visible = false;
        });

        // Update React state to trigger re-render of legend
        setNodesArray((prevNodes) => [...prevNodes]);
    }, []);

    const resetZoom = useCallback(() => {
        if (svgRef.current && zoomRef.current) {
            const svg = d3.select(svgRef.current);
            svg.transition().duration(750).call(zoomRef.current.transform, d3.zoomIdentity);
        }
    }, []);

    // Utility functions to safely get node positions
    function getNodeX(node: string | Node): number {
        return typeof node === 'object' && node.x !== undefined ? node.x : 0;
    }

    function getNodeY(node: string | Node): number {
        return typeof node === 'object' && node.y !== undefined ? node.y : 0;
    }

    // Functions to adjust link filter
    const showNegativeLinks = () => setCurrentFilter('negative');
    const showPositiveLinks = () => setCurrentFilter('positive');
    const resetView = () => setCurrentFilter('all');

    // Boolean to check if there are any negative links (used to toggle button-container). If false, link update buttons will be disabled.
    const hasNegativeLinks = linksArray.some((link) => link.value < 0);

    // Effect to set up the network graph
    useEffect(() => {
        if (!svgRef.current) return;
        const svg = d3.select(svgRef.current); // Select the SVG element
        const width = svg.node()?.getBoundingClientRect().width || 0; // Get the width of the SVG
        const height = svg.node()?.getBoundingClientRect().height || 0; // Get the height of the SVG
        svg.selectAll('*').remove(); // Remove existing elements in svg
        const g = svg.append('g'); // Append a group element to the SVG

        // Create nodes using the node data
        const nodes: Node[] = Object.entries(nodeData).map(([key, value]) => ({
            id: key, // Set the node ID
            originalName: key, // Set the original name of the node
            group: key, // Set the group (used for coloring)
            value: value, // Set the node value
            visible: true, // Set initial visibility to true
        }));

        // Create edges using the edge data
        const links: Link[] = edgeData
            .filter(
                (d) => nodes.some((n) => n.id === d.source) && nodes.some((n) => n.id === d.target)
            )
            .map((d) => ({
                source: d.source,
                target: d.target,
                value: d.value,
            }));

        // Update states of nodes and edges
        setNodesArray(nodes);
        setLinksArray(links);

        // Create scales
        const colorScale = d3.scaleOrdinal<string, string>().range(config.colors);

        const sizeScale = d3
            .scaleLinear<number, number>()
            .domain([0, d3.max(nodes, (d) => d.value) || 1]) // Input domain: from 0 to the maximum node value
            .range([config.minNodeSize, config.maxNodeSize]); // Maps to node sizes

        // TODO: Determine if power or linear scale is more appropriate depending on variation in edge values
        const linkScale = d3
            .scalePow<number, number>()
            .exponent(3) // Use a cubic scale for more dramatic differences
            .domain([0, d3.max(links, (d) => Math.abs(d.value)) || 1]) // Input domain: from 0 to the maximum absolute edge value
            .range([config.minLinkWidth, config.maxLinkWidth]); // Maps to line widths

        // Create force simulation
        // TODO: Set forces based on number of nodes and links
        const sim = d3
            .forceSimulation<Node>(nodes)
            .force(
                'link',
                d3
                    .forceLink<Node, Link>(links)
                    .id((d) => d.id)
                    .strength(config.linkStrength)
            ) // Set a weak link strength for more flexibility
            .force('charge', d3.forceManyBody<Node>().strength(config.nodeCharge)) // Add charge force (nodes repel each other)
            .force('center', d3.forceCenter(width / 2, height / 2)) // Add centering force
            .force(
                'collision',
                d3
                    .forceCollide<Node>()
                    .radius((d) => sizeScale(d.value) + config.collisionForce)
            ); // Add collision force to prevent node overlap

        // Set simulation state
        setSimulation(sim);

        // Create links
        const link = g
            .selectAll<SVGLineElement, Link>('.link')
            .data(links)
            .enter()
            .append('line')
            .attr('class', (d) => `link ${d.value < 0 ? 'negative' : ''}`)
            .style('stroke-width', (d) => linkScale(Math.abs(d.value)))
            .on('mouseover', highlightLink)
            .on('mouseout', resetLinkHighlight);

        link.append("title")
            .text(d => {
                const value = d.value;
                return Number.isInteger(value) || value.toString().split('.')[1]?.length <= 3
                    ? `${value}`
                    : value.toFixed(3);
            });

        // Create nodes
        const node = g
            .selectAll<SVGCircleElement, Node>('.node')
            .data(nodes)
            .enter()
            .append('circle')
            .attr('class', 'node')
            .attr('r', (d) => sizeScale(d.value))
            .attr('fill', (d) => colorScale(d.group))
            .on('mouseover', highlightConnectedNodes)
            .on('mouseout', resetHighlightedNodes);

        node.append("title")
            .text(d => `${d.originalName}: ${d.value}`);

        // TODO: Figure out how to keep labels the same font size visually as graph zoomed
        // Create labels
        const labels = g
            .selectAll<SVGTextElement, Node>('.node-label')
            .data(nodes)
            .enter()
            .append('text')
            .attr('class', 'node-label')
            .text((d) => d.originalName)
            .attr('dx', (d) => sizeScale(d.value) + config.labelOffset) // Position relative to node size
            .attr('dy', (d) => sizeScale(d.value) / 2); // Vertically center relative to node

        // Update positions on tick
        sim.on('tick', () => {
            // Update the positions of the edges
            link
                .attr('x1', (d) => getNodeX(d.source))
                .attr('y1', (d) => getNodeY(d.source))
                .attr('x2', (d) => getNodeX(d.target))
                .attr('y2', (d) => getNodeY(d.target));

            // Update the positions of the nodes
            node.attr('cx', (d) => d.x ?? 0).attr('cy', (d) => d.y ?? 0);

            // Update the positions of the labels
            labels.attr('x', (d) => d.x ?? 0).attr('y', (d) => d.y ?? 0);
        });

        // Drag functions
        const drag = d3
            .drag<SVGCircleElement, Node>()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended);

        node.call(drag as any);

        function dragstarted(event: D3DragEvent<SVGCircleElement, Node, Node>, d: Node) {
            // If this is the only active drag gesture, restart the simulation
            if (!event.active) sim.alphaTarget(config.simulationAlpha).restart();

            // Fix the node's position at its current location
            d.fx = d.x;
            d.fy = d.y;
        }

        // Function called repeatedly while dragging a node
        function dragged(event: D3DragEvent<SVGCircleElement, Node, Node>, d: Node) {
            // Update the node's fixed position to the current drag position
            d.fx = event.x;
            d.fy = event.y;
        }

        // Function called when releasing a dragged node
        function dragended(event: D3DragEvent<SVGCircleElement, Node, Node>, d: Node) {
            // If this is the last active drag gesture, cool down the simulation
            if (!event.active) sim.alphaTarget(0);

            // Release the node's fixed position
            d.fx = null;
            d.fy = null;
        }

        // Highlight functions
        function highlightConnectedNodes(event: any, d: Node) {
            // If node is not visible, return
            if (!d.visible) return;

            // Get colour of hovered node
            const nodeColor = colorScale(d.group);

            // Create sets to store connected node IDs and link IDs
            const connectedNodeIds = new Set<string>([d.id]);
            const connectedLinkIndices = new Set<number>();

            // Identify connected nodes and links
            links.forEach((l, index) => {
                const sourceNode =
                    typeof l.source === 'object' ? l.source : nodes.find((n) => n.id === l.source);
                const targetNode =
                    typeof l.target === 'object' ? l.target : nodes.find((n) => n.id === l.target);
                if (
                    ((sourceNode?.id === d.id && targetNode?.visible) ||
                        (targetNode?.id === d.id && sourceNode?.visible)) &&
                    isLinkVisible(l)
                ) {
                    if (sourceNode) connectedNodeIds.add(sourceNode.id);
                    if (targetNode) connectedNodeIds.add(targetNode.id);
                    connectedLinkIndices.add(index);
                }
            });

            // Apply fading and highlighting
            link
                .classed('faded-link', (_, i) => !connectedLinkIndices.has(i))
                .classed('highlighted', (_, i) => connectedLinkIndices.has(i))
                .style('stroke', (_, i) => (connectedLinkIndices.has(i) ? nodeColor : null))
                .style('stroke-opacity', (_, i) =>
                    connectedLinkIndices.has(i) ? config.highlightOpacity : config.fadedOpacity
                );
        
            node.style('opacity', (n) => {
                if (!n.visible) return config.fadedOpacity;
                return connectedNodeIds.has(n.id) ? config.highlightOpacity : config.fadedOpacity;
            });
        
            labels.style('opacity', (n) => {
                if (!n.visible) return config.fadedOpacity;
                return connectedNodeIds.has(n.id) ? config.highlightOpacity : config.fadedOpacity;
            });
        }
        
        function resetHighlightedNodes() {
            link
                .classed('highlighted faded', false)
                .style('stroke', null)
                .style('stroke-opacity', config.defaultLinkOpacity);
        
            node.style('opacity', (n) => (n.visible ? config.highlightOpacity : config.fadedOpacity));
            labels.style('opacity', (n) => (n.visible ? config.highlightOpacity : config.fadedOpacity));
        }

        // Link highlight function
        function highlightLink(event: any, d: Link) {
            d3.select<SVGLineElement, Link>(event.currentTarget)
                .style('stroke-opacity', 1)
                .style('stroke-width', () => linkScale(Math.abs(d.value)) * 1.5);
        
            link
                .filter((l) => l !== d)
                .style('stroke-opacity', config.fadedOpacity);
        
            const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
            const targetId = typeof d.target === 'object' ? d.target.id : d.target;
        
            node.style('opacity', (n) => {
                if (!n.visible) return config.fadedOpacity;
                return n.id === sourceId || n.id === targetId ? config.highlightOpacity : config.fadedOpacity;
            });
        
            labels.style('opacity', (n) => {
                if (!n.visible) return config.fadedOpacity;
                return n.id === sourceId || n.id === targetId ? config.highlightOpacity : config.fadedOpacity;
            });
        }
        
        function resetLinkHighlight() {
            link.style('stroke-opacity', config.defaultLinkOpacity);
            node.style('opacity', (n) => (n.visible ? config.highlightOpacity : config.fadedOpacity));
            labels.style('opacity', (n) => (n.visible ? config.highlightOpacity : config.fadedOpacity));
        }

        // Zoom function
        const zoom = d3
            .zoom<SVGSVGElement, unknown>()
            .scaleExtent(config.zoomExtent)
            .on('zoom', (event) => {
                g.attr('transform', event.transform.toString());
            });

        svg.call(zoom);
        zoomRef.current = zoom;

        // Cleanup function
        return () => {
            sim.stop();
        };
    }, [nodeData, edgeData, isLinkVisible]);

    // Effect to toggle nodes and links on and off
    useEffect(() => {
        if (!simulation || !svgRef.current) return;
        const svg = d3.select(svgRef.current);
        svg.selectAll<SVGCircleElement, Node>('.node').style('opacity', (d) =>
            d.visible ? config.highlightOpacity : config.fadedOpacity
        ); // set opacity to 1 if visible, 0.1 otherwise

        svg.selectAll<SVGTextElement, Node>('.node-label').style('opacity', (d) =>
            d.visible ? config.highlightOpacity : config.fadedOpacity
        ); // set opacity to 1 if visible, 0.1 otherwise

        svg.selectAll<SVGLineElement, Link>('.link').style('display', (d) => {
            const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
            const targetId = typeof d.target === 'object' ? d.target.id : d.target;
            const sourceVisible = nodesArray.find((n) => n.id === sourceId)?.visible;
            const targetVisible = nodesArray.find((n) => n.id === targetId)?.visible;
            if (!sourceVisible || !targetVisible) return 'none'; // If one or both nodes are not visible, return "none"
            return isLinkVisible(d) ? 'inline' : 'none'; // If the link is visible, return "inline", otherwise return "none"
        });
    }, [nodesArray, linksArray, simulation, currentFilter, isLinkVisible]);

    return (
        <div className="container">
            <div className="graph-container">
                <div className="links-button-container">
                    {hasNegativeLinks && (
                        <>
                            <button
                                className={`filter-button ${
                                    currentFilter === 'positive' ? 'active' : ''
                                }`}
                                onClick={showPositiveLinks}
                                title="Show only positive links"
                            >
                                <Plus className="button-icon" />
                            </button>
                            <button
                                className={`filter-button ${
                                    currentFilter === 'negative' ? 'active' : ''
                                }`}
                                onClick={showNegativeLinks}
                                title="Show only negative links"
                            >
                                <Minus className="button-icon" />
                            </button>
                            <button className="legend-button" onClick={resetView} title="Reset links">
                                <RefreshCw className="button-icon" />
                            </button>
                        </>
                    )}
                </div>
                    <div className="center-button-container">
                    <button className="legend-button" onClick={resetZoom} title="Centre graph view">
                        <Locate className="button-icon" />
                    </button>
                </div>
                <svg ref={svgRef} width="100%" height="100%" />
            </div>
            <div className="legend-container">
                <div className="legend-items">
                    {nodesArray.map((node, index) => (
                        <div
                            key={index}
                            className="legend"
                            style={{ opacity: node && node.visible ? 1 : config.legendOpacity }}
                            onClick={() => updateNodeVisibility(node)}
                        >
                            <span
                                className="legend-color"
                                style={{
                                    backgroundColor:
                                        config.colors[index % config.colors.length],
                                }}
                            />
                            <span className="legend-text">{node.originalName}</span>
                        </div>
                    ))}
                </div>
                <div className="legend-controls">
                    <button className="legend-button" onClick={selectAll}>
                        Select All
                    </button>
                    <button className="legend-button" onClick={selectNone}>
                        Select None
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NetworkGraph;
