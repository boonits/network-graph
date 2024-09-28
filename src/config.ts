interface Config {
  minNodeSize: number;
  maxNodeSize: number;
  minLinkWidth: number;
  maxLinkWidth: number;
  labelOffset: number;
  defaultLinkOpacity: number;
  highlightOpacity: number;
  fadedOpacity: number;
  legendOpacity: number;
  zoomExtent: [number, number];
  nodeCharge: number;
  linkStrength: number;
  collisionForce: number;
  simulationAlpha: number;
  colors: string[];
}


const config: Config = {
    minNodeSize: 5,     // Minimum size of nodes in the graph
    maxNodeSize: 20,    // Maximum size of nodes in the graph
    minLinkWidth: 1.25, // Minimum width of links (edges) in the graph
    maxLinkWidth: 3,    // Maximum width of links (edges) in the graph
    labelOffset: 5,     // Distance between node and its label
    defaultLinkOpacity: 0.6,      // Default opacity of links
    highlightOpacity: 1,   // Opacity of highlighted nodes, labels, and links
    fadedOpacity: 0.05,     // Opacity of faded (non-highlighted) elements
    legendOpacity: 0.5,    // Opacity of legend items when not selected
    zoomExtent: [0.1, 8],  // Minimum and maximum zoom levels
    nodeCharge: -200,      // Strength of node repulsion (negative value)
    linkStrength: 0.001,   // Strength of link attraction
    collisionForce: 5,     // Strength of collision avoidance between nodes
    simulationAlpha: 0.005,  // Level of energy or movement in the force-directed graph layout algorithm
    colors: [
        '#e6194B', '#3cb44b', '#9999FF', '#FFA07A', '#F0E68C', '#FF99FF',
        '#00FFFF', '#800000', '#1ABC9C', '#000080', '#808000', 
        '#800080', '#008080', '#FFA500', '#A52A2A', '#FFC0CB', 
        '#98FB98', '#DDA0DD', '#FFD700', '#40E0D0'
    ] // Colors of the nodes - max 20 colors
};

export default config;