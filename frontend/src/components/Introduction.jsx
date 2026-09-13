import React from 'react';

export default function Introduction() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        minHeight: '60vh',
        padding: '60px 20px',
        maxWidth: '740px',
        margin: '0 auto'
      }}
    >
      <h1
        style={{
          fontSize: 'clamp(44px, 6vw, 68px)',
          fontWeight: 800,
          letterSpacing: '-0.04em',
          color: 'var(--inkHeading)',
          lineHeight: 1.05,
          margin: '0 0 20px 0'
        }}
      >
        Refunder
      </h1>
      <p
        style={{
          fontSize: '16px',
          color: 'var(--muted)',
          lineHeight: 1.7,
          margin: 0,
          maxWidth: '640px'
        }}
      >
        An autonomous AI governance system that evaluates expense claims, validates compliance against operational regulations, and accurately routes ambiguous or high-risk claims to designated human decision-makers.
      </p>
    </div>
  );
}
