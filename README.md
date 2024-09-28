## Network Graph Visualiser

This project is a React-based network graph visualisation tool built with D3.js. It allows users to visualise network data with interactive features such as zooming, panning, and node/edge filtering. The accompanying `App.tsx` is an example of how the component can be integrated into a React project.

## Features

- **Interactive Visualisation**: Users can interact with the nodes and edges, zoom in/out, and highlight specific connections.
- **Node & Edge Filtering**: A legend allows users to toggle the visibility of nodes and filter edges by positive or negative values.
- **Customisable Design**: The graph's appearance, including node size, colour, and link width, can be easily adjusted through configuration.

## Network Graph Component

The core of this project is the `NetworkGraph` component. It takes two key inputs:

- `nodeData`: An object mapping node IDs to their numerical values (used to determine node sizes).
- `edgeData`: An array of edges (links), each containing a source, target, and value. Positive and negative values differentiate between link types.

##### Example usage

```
import NetworkGraph from './NetworkGraph';

const nodeData = {
  "Node 1": 10,
  "Node 2": 20,
  "Node 3": 15,
  "Node 4": 25,
  "Node 5": 30
};

const edgeData = [
  { source: "Node 1", target: "Node 2", value: 1 },
  { source: "Node 1", target: "Node 3", value: -2 },
  { source: "Node 2", target: "Node 4", value: 3 },
  { source: "Node 3", target: "Node 5", value: 4 },
  { source: "Node 4", target: "Node 5", value: -5 }
];

<NetworkGraph nodeData={nodeData} edgeData={edgeData} />;

```


## Getting Started

1. Clone the repository:

```
git clone https://github.com/boonits/network-graph.git
```
2. Install the necessary dependencies
``` 
npm install 
```
3. Start the development server
```
npm start
```

## Usage

##### Click the legend items to toggle node visibility
![legend-visibility](https://i.imgur.com/AFEF7OZ.gif)

##### Use the buttons at the top to filter positive/negative links or reset the view
![link-buttons](https://i.imgur.com/ioT3tJ9.gif)

*Note: If you don't have negative values in the `edgeData`, these buttons won't be active.*

##### Re-center the graph
![center](https://i.imgur.com/DAERwib.gif)

##### Hover over a node to highlight other connected nodes
![node-hover](https://i.imgur.com/dCx3YQl.gif)

##### Hover over link to view value
![link-hover](https://i.imgur.com/v7x6wJo.gif)

##### Click and drag nodes to reposition them
![re-position](https://i.imgur.com/D0D5BQN.gif)

## Future Improvements

Potential future features:

- Additional filters for nodes based on custom criteria.
- More detailed hover interactions, showing additional node and edge data.
- Exporting the graph as an image or data file.