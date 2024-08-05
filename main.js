
// Framework configuration
const config = {
    minNodeSize: 5,     // Minimum size of nodes in the graph
    maxNodeSize: 20,    // Maximum size of nodes in the graph
    minLinkWidth: 1.25, // Minimum width of links (edges) in the graph
    maxLinkWidth: 3,    // Maximum width of links (edges) in the graph
    labelOffset: 5,     // Distance between node and its label
    defaultLinkOpacity: 0.5,      // Default opacity of links
    nonHighlightLinkOpacity: 0.3, // Opacity of all other links when 
    highlightLinkOpacity: 1,   // Opacity of highlighted links
    fadedOpacity: 0.1,     // Opacity of faded (non-highlighted) elements
    legendOpacity: 0.5,    // Opacity of legend items when not selected
    zoomExtent: [0.1, 8],  // Minimum and maximum zoom levels
    nodeCharge: -200,      // Strength of node repulsion (negative value)
    linkStrength: 0.001,   // Strength of link attraction
    collisionForce: 5,     // Strength of collision avoidance between nodes
    simulationAlpha: 0.3,  // Level of energy or movement in the force-directed graph layout algorithm
    colors: [
        '#e6194B', '#3cb44b', '#9999FF', '#FFA07A', '#F0E68C', '#FF99FF',
        '#00FFFF', '#800000', '#1ABC9C', '#000080', '#808000', 
        '#800080', '#008080', '#FFA500', '#A52A2A', '#FFC0CB', 
        '#98FB98', '#DDA0DD', '#FFD700', '#40E0D0'
    ] // Colors of the nodes - max 20 colors
};

// Function to create the network graph
function createNetworkGraph(nodeData, edgeData) {
    const svg = d3.select("svg"); // Select the SVG element
    const width = svg.node().getBoundingClientRect().width; // Get the width of the SVG
    const height = svg.node().getBoundingClientRect().height; // Get the height of the SVG
    const g = svg.append("g"); // Append a group element to the SVG
    let currentFilter = 'all'; // Initialize the current filter flag to show all links

    // Add zoom functionality
    const zoom = d3.zoom()
        .scaleExtent(config.zoomExtent)
        .on("zoom", zoomed);
    svg.call(zoom);

    // Create a color scale for nodes
    const color = d3.scaleOrdinal().range(config.colors);

    // Create nodes using the node data
    const nodes = Object.entries(nodeData).map(([key, value]) => ({
        id: key, // Set the node ID
        originalName: key, // Set the original name of the node
        group: key, // Set the group (used for coloring)
        value: value, // Set the node value
        visible: true // Set initial visibility to true
    }));

    // Create edges using the edge data
    const links = edgeData.filter(d => 
        nodes.some(n => n.id === d.source) && 
        nodes.some(n => n.id === d.target)
    ).map(d => ({
        source: d.source,
        target: d.target,
        value: d.value
    }));

    // Create a linear scale for node sizes
    const sizeScale = d3.scaleLinear()
        .domain([0, d3.max(nodes, d => d.value)])  // Input domain: from 0 to the maximum node value
        .range([config.minNodeSize, config.maxNodeSize]); // Maps to node sizes

    // Create a power scale for edge widths    
    // Change this to linear depending on edge values. 
    const edgeScale = d3.scalePow()
        .exponent(3) // Use a cubic scale for more dramatic differences
        .domain([0, d3.max(links, d => Math.abs(d.value))]) // Input domain: from 0 to the maximum absolute edge value
        .range([config.minLinkWidth, config.maxLinkWidth]); // Maps to line widths 

    // TODO: Set forces based on number of nodes and links
    // Create a force simulation
    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).strength(config.linkStrength)) // Set a weak link strength for more flexibility
        .force("charge", d3.forceManyBody().strength(config.nodeCharge)) // Add charge force (nodes repel each other)
        .force("center", d3.forceCenter(width / 2, height / 2)) // Add centering force
        .force("collision", d3.forceCollide().radius(d => sizeScale(d.value) + config.collisionForce)); // Add collision force to prevent node overlap

    // Add each link (add links first so they sit beneath nodes)
    const link = g.selectAll(".link") // Select all elements with class "link"
        .data(links) // Bind link data
        .enter().append("line") // For each new data point, append a line element
        .attr("class", d => `link ${d.value < 0 ? 'negative' : ''}`) // Add "link" class, then add "negative" class is value is negative
        .style("stroke-width", d => edgeScale(Math.abs(d.value))) // Set line thickness using edgeScale function
        .on("mouseover", highlightLink) 
        .on("mouseout", resetLinkHighlight); 
    
    link.append("title")
        .text(d => {
            const value = d.value;
            return Number.isInteger(value) || value.toString().split('.')[1]?.length <= 3
                ? `${value}`
                : value.toFixed(3);
        });

    // Add each node
    const node = g.selectAll(".node") // Select all elements with class "node", even if none exist yet
        .data(nodes) // Bind data to selection. D3 matches data to existing elements, if any exist. 
        .enter().append("circle") // Use enter selection to append a circle element for all data points that don't exist yet
        .attr("class", "node") // Add "node" CSS class
        .attr("r", d => sizeScale(d.value)) // Set the radius based on node value using the sizeScale function
        .attr("fill", d => color(d.group)) // Set the color based on node group
        .call(d3.drag() // Add drag behavior
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended))
        .on("mouseover", highlightConnections) // Add hover behavior
        .on("mouseout", resetHighlight);

    // Add node tool tip titles
    node.append("title")
        .text(d => `${d.originalName}: ${d.value}`);

    // Add node labels
    const labels = g.selectAll(".node-label") // Select all elements with class "node-label"
        .data(nodes) // Bind node data
        .enter().append("text")  // For each new data point, append a text element
        .attr("class", "node-label") // Add CSS class
        .text(d => d.originalName) // Set text content to node name
        .attr("dx", d => sizeScale(d.value) + config.labelOffset) // Position relative to node size
        .attr("dy", d => sizeScale(d.value) / 2); // Vertically center relative to node

    // Add an event listener for the "tick" events of the force simulation
    // Tick event is fired many times per second as force simulation runs
    // It allows use to update the positions of the nodes and links based on current state of simulation
    simulation.on("tick", () => {
        // Update the positions of the links (edges)
        link
            .attr("x1", d => d.source.x) // Set the x-coordinate of the line start to the source node's x-position
            .attr("y1", d => d.source.y) // Set the y-coordinate of the line start to the source node's y-position
            .attr("x2", d => d.target.x) // Set the x-coordinate of the line end to the target node's x-position
            .attr("y2", d => d.target.y); // Set the y-coordinate of the line end to the target node's y-position

        // Update the positions of the nodes
        node
            .attr("cx", d => d.x) // Set the x-coordinate of the circle center to the node's x-position
            .attr("cy", d => d.y); // Set the y-coordinate of the circle center to the node's y-position

        // Update the positions of the labels    
        labels
            .attr("x", d => d.x) // Set the x-coordinate of the text to the node's x-position
            .attr("y", d => d.y); // Set the y-coordinate of the text to the node's y-position
    });

    // Create legend
    const legend = d3.select(".legend-items") // Select the container for legend items
        .selectAll(".legend") // Select all elements with class "legend" (initially empty)
        .data(nodes) // Bind the node data to the selection
        .enter().append("div") // Create new elements for each data point that doesn't exist, and append 'div' 
        .attr("class", "legend") // Add CSS class "legend"

    // Add legend color
    legend.append("span")
        .attr("class", "legend-color")
        .style("background-color", d => color(d.group));

    // Add legend text
    legend.append("span")
        .text(d => d.originalName);

    // Toggle nodes and links on legend item click
    legend.on("click", function(event, d) {
        d.visible = !d.visible; // Set node visible attribute (set true if currently false, false if currently true)
        updateNodeVisibility(); // Update node visibility
    });

    function zoomed(event) {
        g.attr("transform", event.transform);
    }

    // Function called when starting to drag a node
    function dragstarted(event, d) {
        // If this is the only active drag gesture, restart the simulation
        if (!event.active) simulation.alphaTarget(config.simulationAlpha).restart();
        // simulation.alphaTarget(0.3) increases the simulation's "temperature",
        // causing more movement, which helps with repositioning

        // Fix the node's position at its current location
        d.fx = d.x; 
        d.fy = d.y; 
    }

    // Function called repeatedly while dragging a node
    function dragged(event, d) {
         // Update the node's fixed position to the current drag position
        d.fx = event.x;
        d.fy = event.y;
    }

    // Function called when releasing a dragged node
    function dragended(event, d) {
        // If this is the last active drag gesture, cool down the simulation
        if (!event.active) simulation.alphaTarget(0);
        // simulation.alphaTarget(0) allows the simulation to cool down and settle

        // Release the node's fixed position
        d.fx = null;
        d.fy = null;
        // This allows the node to be repositioned by the force simulation again
    }

    function highlightLink(event, d) {
        // Darken the link
        d3.select(this)
            .style("stroke-opacity", 1)
            .style("stroke-width", d => edgeScale(Math.abs(d.value)) * 1.5);
        
        link.filter(l => l !== d)
            .style("stroke-opacity", config.nonHighlightLinkOpacity);
        
    }

    function resetLinkHighlight() {
        // Reset link style
       
        link.style("stroke-opacity", config.defaultLinkOpacity);

    }

    function highlightConnections(event, d) {
        // If node is not visible, return
        if (!d.visible) return;
    
        // Get colour of hovered node
        const nodeColor = color(d.group);

        // Create sets to store connected node IDs and link IDs
        const connectedNodeIds = new Set([d.id]);
        const connectedLinkIds = new Set();
        
        // Identify connected nodes and links
        links.forEach(l => {
            // Check if the current link is connected to the hovered/selected node
            if ((l.source.id === d.id && l.target.visible) || (l.target.id === d.id && l.source.visible)) {
                // Check if the link should be visible based on the current filter
                if (isLinkVisible(l)) {
                    // Add both source and target node IDs to the connected nodes set
                    connectedNodeIds.add(l.source.id).add(l.target.id);
                    // Add the link ID to the connected links set
                    connectedLinkIds.add(l.index);
                }
            }
        });
    
        // Apply fading and highlighting
        link.classed("faded-link", l => !connectedLinkIds.has(l.index)) // Fade links that are not connected
            .classed("highlighted", l => connectedLinkIds.has(l.index)) // Highlight connected links
            .style("stroke", l => connectedLinkIds.has(l.index) ? nodeColor : null) // Color connected links
            .style("stroke-opacity", l => connectedLinkIds.has(l.index) ? config.highlightOpacity : config.fadedOpacity); // Adjust opacity
    
        node.classed("faded", n => !connectedNodeIds.has(n.id))  // Fade nodes that are not connected
    
        labels.classed("faded", n => !connectedNodeIds.has(n.id)) // Fade labels of nodes that are not connected
    }

    // Remove highlighting and fading when not hovering over a node
    function resetHighlight() {
        link.classed("highlighted faded", false) 
            .style("stroke", null)
            .style("stroke-opacity", config.defaultLinkOpacity);
        node.classed("faded", false);
        labels.classed("faded", false);
    }

    function updateNodeVisibility() {
        g.selectAll(".node") // find all nodes
            .style("opacity", d => d.visible ? config.highlightOpacity : config.fadedOpacity); // set opacity to 1 if visible, 0.1 otherwise
        
        g.selectAll(".node-label") // find all node labels
            .style("opacity", d => d.visible ? config.highlightOpacity : config.fadedOpacity); // set opacity to 1 if visible, 0.1 otherwise

        legend.style("opacity", d => d.visible ? 1 : config.legendOpacity); // set opacity to 1 if visible, 0.5 otherwise

        updateEdgeVisibility(); // Update the edge visibility
        readjustSimulation(); // Readjust the force simulation
    }

    function updateEdgeVisibility() {
        link.style("display", d => {
            const sourceVisible = nodes.find(n => n.id === d.source.id).visible; // Check if the source node is visible
            const targetVisible = nodes.find(n => n.id === d.target.id).visible; // Check if the target node is visible
            if (!sourceVisible || !targetVisible) return "none"; // If one or both nodes are not visible, return "none"
            return isLinkVisible(d) ? "inline" : "none"; // If the link is visible, return "inline", otherwise return "none"
        });
    }

    function isLinkVisible(l) {
        return currentFilter === 'all' || 
               (currentFilter === 'positive' && l.value >= 0) || 
               (currentFilter === 'negative' && l.value < 0);
    }

    function readjustSimulation() {
        const visibleNodes = nodes.filter(n => n.visible); // Filter the nodes to only include those that are visible 
        const visibleLinks = links.filter(l =>  // Filter the links to only include those that are connected to nodes that are visible
            visibleNodes.some(n => n.id === l.source.id || n.id === l.source) && 
            visibleNodes.some(n => n.id === l.target.id || n.id === l.target)
        );

        simulation.nodes(visibleNodes); // Update the force simulation with the filtered nodes
        simulation.force("link").links(visibleLinks); // Update the force simulation with the filtered links

        const nodeCount = visibleNodes.length; // Calculate the number of nodes that are visible
        simulation.force("charge", d3.forceManyBody().strength(config.nodeCharge * (nodeCount / nodes.length))); // Adjust the force simulation based on the number of nodes
        simulation.force("center", d3.forceCenter(width / 2, height / 2)); // Center the force simulation
        simulation.force("collision", d3.forceCollide().radius(d => sizeScale(d.value) + config.collisionForce)); // Adjust the force simulation based on the node sizes

        simulation.alpha(1).restart(); // Start the simulation
    }

    function selectAll() {
        nodes.forEach(node => node.visible = true); // Set all nodes to visible
        updateNodeVisibility(); // Update the node visibility
    }

    function selectNone() {
        nodes.forEach(node => node.visible = false); // Set all nodes to invisible
        updateNodeVisibility(); // Update the node visibility
    }

    function showNegativeLinks() {
        currentFilter = 'negative'; // Set the current filter to 'negative'
        updateEdgeVisibility(); // Update the edge visibility
        updateButtonStyles(); // Update the button styles
    }

    function showPositiveLinks() {
        currentFilter = 'positive'; // Set the current filter to 'positive'
        updateEdgeVisibility(); // Update the edge visibility
        updateButtonStyles(); // Update the button styles
    }

    function resetView() {
        currentFilter = 'all'; // Set the current filter to 'all'
        updateEdgeVisibility(); // Update the edge visibility
        updateButtonStyles(); // Update the button styles
    }

    function centerView() {
        
        const width = svg.node().getBoundingClientRect().width;
        const height = svg.node().getBoundingClientRect().height;

        const visibleNodes = nodes.filter(n => n.visible);
        if (visibleNodes.length === 0) return;  // No visible nodes to center on

        // Calculate the bounding box of visible nodes
        const bbox = calculateBoundingBox(visibleNodes);

        // Calculate the scale to fit the graph
        const scale = Math.min(
            0.6 * width / bbox.width,
            0.6 * height / bbox.height
        );

        // Calculate the translation to center the graph
        const translate = [
            (width - scale * (bbox.x.min + bbox.x.max)) / 2,
            (height - scale * (bbox.y.min + bbox.y.max)) / 2
        ];

        // Apply the new transform
        const transform = d3.zoomIdentity
            .translate(translate[0], translate[1])
            .scale(scale);

        svg.transition().duration(500)
            .call(zoom.transform, transform);
    }

    function calculateBoundingBox(nodes) {
        const bbox = {
            x: { min: Infinity, max: -Infinity },
            y: { min: Infinity, max: -Infinity }
        };

        nodes.forEach(node => {
            bbox.x.min = Math.min(bbox.x.min, node.x);
            bbox.x.max = Math.max(bbox.x.max, node.x);
            bbox.y.min = Math.min(bbox.y.min, node.y);
            bbox.y.max = Math.max(bbox.y.max, node.y);
        });

        bbox.width = bbox.x.max - bbox.x.min;
        bbox.height = bbox.y.max - bbox.y.min;

        return bbox;
    }


    function updateButtonStyles() {
        document.getElementById("showNegative").classList.toggle("active", currentFilter === 'negative');
        document.getElementById("showPositive").classList.toggle("active", currentFilter === 'positive');
        document.getElementById("resetView").classList.toggle("active", currentFilter === 'all');
    }

    function hasNegativeLinks() {
        return links.some(link => link.value < 0);
    }

    const negativeLinksExist = hasNegativeLinks();

    // Event listeners
    if (negativeLinksExist) {
        document.getElementById("showNegative").addEventListener("click", showNegativeLinks);
        document.getElementById("showPositive").addEventListener("click", showPositiveLinks);
        document.getElementById("resetView").addEventListener("click", resetView);
    } else {
        document.getElementById("showNegative").style.display = "none";
        document.getElementById("showPositive").style.display = "none";
        document.getElementById("resetView").style.display = "none";
    }
    document.getElementById("centerView").addEventListener("click", centerView);
    document.getElementById("selectAll").addEventListener("click", selectAll);
    document.getElementById("selectNone").addEventListener("click", selectNone);

    updateEdgeVisibility();
    updateButtonStyles();
}