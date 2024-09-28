import React from 'react';
import NetworkGraph from './NetworkGraph';

// Example data and implementation of the NetworkGraph component

const App = () => {
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

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <NetworkGraph nodeData={nodeData} edgeData={edgeData} />
    </div>
  );
};

export default App;