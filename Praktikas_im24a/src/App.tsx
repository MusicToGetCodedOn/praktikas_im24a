import React, { useState } from 'react';
import tableData from './data.json';

interface TableData {
  rank: string[];
  name: string[];
  firma: string[];
  link: string[];
}

export default function App() {
  const data: TableData = tableData as TableData;
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  return (
    <>
      {/* Keyframe-Animationen für geschmeidiges Einblenden */}
      <style>{`
        @keyframes fadeInSlideUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animated-row {
          opacity: 0;
          animation: fadeInSlideUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .custom-link-btn:hover {
          background-color: #ffffff !important;
          color: #09090b !important;
          border-color: #ffffff !important;
          box-shadow: 0 0 15px rgba(255, 255, 255, 0.2);
        }

        .custom-link-btn:hover .arrow-icon {
          transform: translate(2px, -2px);
        }
      `}</style>

      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#09090b',
          color: '#fafafa',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif',
          padding: '3.5rem 1.5rem',
          display: 'flex',
          justifyContent: 'center',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ width: '100%', maxWidth: '1020px' }}>
          {/* Header Section */}
          <header
            style={{
              marginBottom: '2rem',
              animation: 'fadeInSlideUp 0.5s ease-out forwards',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.35rem 0.75rem',
                borderRadius: '9999px',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                fontSize: '0.75rem',
                fontWeight: 500,
                color: '#a1a1aa',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                marginBottom: '1rem',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  boxShadow: '0 0 8px #10b981',
                }}
              />
              Klasse IM24A
            </div>

            <h1
              style={{
                fontSize: '1.875rem',
                fontWeight: 650,
                letterSpacing: '-0.03em',
                margin: '0 0 0.5rem 0',
                color: '#f4f4f5',
              }}
            >
              Praktika-Übersicht
            </h1>
          </header>

          {/* Table Card Container */}
          <div
            style={{
              backgroundColor: '#121215',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow:
                '0 8px 30px rgba(0, 0, 0, 0.6), 0 0 1px 1px rgba(255, 255, 255, 0.05)',
              overflow: 'hidden',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.875rem',
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#71717a',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontWeight: 600,
                  }}
                >
                  <th style={{ padding: '0.95rem 1.25rem', width: '80px' }}>
                    Rang
                  </th>
                  <th style={{ padding: '0.95rem 1.25rem' }}>Name</th>
                  <th style={{ padding: '0.95rem 1.25rem' }}>Firma</th>
                  <th
                    style={{
                      padding: '0.95rem 1.25rem',
                      textAlign: 'right',
                      width: '140px',
                    }}
                  >
                    Portfolio
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.rank.map((rankId, index) => {
                  const name = data.name[index];
                  const firma = data.firma[index];
                  const link = data.link[index];
                  const isHovered = hoveredRow === index;

                  return (
                    <tr
                      key={rankId}
                      className="animated-row"
                      style={{
                        animationDelay: `${index * 60}ms`,
                        borderBottom:
                          index === data.rank.length - 1
                            ? 'none'
                            : '1px solid rgba(255, 255, 255, 0.05)',
                        backgroundColor: isHovered
                          ? 'rgba(255, 255, 255, 0.04)'
                          : 'transparent',
                        transition:
                          'background-color 150ms cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                      onMouseEnter={() => setHoveredRow(index)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      {/* Rang Badge */}
                      <td style={{ padding: '1.1rem 1.25rem' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '28px',
                            height: '28px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            color: '#e4e4e7',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                          }}
                        >
                          #{rankId}
                        </span>
                      </td>

                      {/* Name */}
                      <td
                        style={{
                          padding: '1.1rem 1.25rem',
                          fontWeight: 550,
                          color: '#f4f4f5',
                        }}
                      >
                        {name}
                      </td>

                      {/* Firma */}
                      <td
                        style={{
                          padding: '1.1rem 1.25rem',
                          color: '#a1a1aa',
                        }}
                      >
                        {firma}
                      </td>

                      {/* Button Link */}
                      <td
                        style={{
                          padding: '1.1rem 1.25rem',
                          textAlign: 'right',
                        }}
                      >
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="custom-link-btn"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.42rem 0.85rem',
                            fontSize: '0.8rem',
                            fontWeight: 500,
                            borderRadius: '8px',
                            color: '#d4d4d8',
                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            textDecoration: 'none',
                            transition: 'all 160ms cubic-bezier(0.4, 0, 0.2, 1)',
                          }}
                        >
                          <span>Website</span>
                          <span
                            className="arrow-icon"
                            style={{
                              fontSize: '0.75rem',
                              transition: 'transform 160ms ease',
                              display: 'inline-block',
                            }}
                          >
                            ↗
                          </span>
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}