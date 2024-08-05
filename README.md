## Network Graph Visualiser

This project is a web-based network graph visualisation tool built with D3.js. It allows users to visualise network data with interactive features such as zooming, panning, and node/edge filtering.

### Features

- Interactive graph visualization with zoom and pan functionality
- Node and edge filtering
- Hover effects to highlight connected nodes and edges

### Getting Started

1. Clone the repository:

```
https://github.com/boonits/network-graph.git
```

2. Open `index.html` in a web browser to view the visualisation.
3. To use your own data, modify the nodeData and edgeData variables in main.js.

### Dependencies

D3.js - Version 7 or later

### Usage

###### Click the legend items to toggle node visibility
![legend-visibility](https://i.imgur.com/ycMCa1b.gif)

###### Use the buttons at the top to filter positive/negative links or reset the view

![link-buttons](https://i.imgur.com/JWV9ReD.gif)

*Note: If you don't have negative values in the `edgeData`, these buttons won't be active.*

###### Re-center the graph

![center](https://i.imgur.com/08zhkPn.gif)

###### Hover over a node to highlight other connected nodes
![node-hover](https://i.imgur.com/gfpA7CN.gif)

###### Hover over link to view value

![link-hover](https://i.imgur.com/wktALEj.gif)

###### Click and drag nodes to reposition them
![re-position](https://i.imgur.com/3E2BrYg.gif)


### Customization
You can customize the appearance and behavior of the graph by modifying the `config` object in `main.js`.

### License
This project is open source and available under the MIT License.

### Acknowledgements

- Icons provided by Google Material Icons
- Graph visualization powered by D3.js
