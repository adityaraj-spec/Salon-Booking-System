import React from "react";

export const LoadingSkeleton = ({ count = 3 }) => {
  return (
    <div style={skeletonStyles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} style={skeletonStyles.card}>
          <div style={skeletonStyles.imagePlaceholder} />
          <div style={skeletonStyles.lineLong} />
          <div style={skeletonStyles.lineShort} />
        </div>
      ))}
    </div>
  );
};

const skeletonStyles = {
  container: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "20px",
    padding: "20px",
    width: "100%",
  },
  card: {
    backgroundColor: "#f7fafc",
    borderRadius: "10px",
    padding: "16px",
    animation: "pulse 1.5s infinite ease-in-out",
  },
  imagePlaceholder: {
    backgroundColor: "#e2e8f0",
    height: "160px",
    borderRadius: "8px",
    marginBottom: "12px",
  },
  lineLong: {
    backgroundColor: "#e2e8f0",
    height: "16px",
    borderRadius: "4px",
    marginBottom: "8px",
    width: "80%",
  },
  lineShort: {
    backgroundColor: "#e2e8f0",
    height: "14px",
    borderRadius: "4px",
    width: "40%",
  },
};

export default LoadingSkeleton;
