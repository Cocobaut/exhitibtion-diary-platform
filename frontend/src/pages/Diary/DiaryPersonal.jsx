import React, { useState } from 'react';
import { DIARY_ENTRIES, MOODS } from '../../data/mockData';
import { Painting } from '../../components/common/Painting';
import { Icon } from '../../components/common/Icons';

export function DiaryPersonal({ onOpenWriteModal }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const activeEntry = DIARY_ENTRIES[selectedIdx] || DIARY_ENTRIES[0];

  return (
    <>
      {/* Left Timeline */}
      <div className="abs" style={{ left: '30px', top: '100px', width: '420px', bottom: '30px', overflowY: 'auto' }}>
        <div
          style={{
            fontFamily: 'var(--serif)',
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--onw)',
            margin: '6px 0 10px',
          }}
        >
          Tháng 10 · 2026
        </div>

        {DIARY_ENTRIES.map((entry, idx) => {
          const isSelected = selectedIdx === idx;
          return (
            <div
              key={idx}
              className="row"
              onClick={() => setSelectedIdx(idx)}
              style={{
                alignItems: 'flex-start',
                gap: '14px',
                padding: '14px',
                borderRadius: '14px',
                marginBottom: '8px',
                cursor: 'pointer',
                background: isSelected ? 'var(--paper)' : 'var(--glass)',
                color: isSelected ? 'var(--ink)' : 'inherit',
                border: isSelected ? 'none' : '1px solid var(--glass-line)',
              }}
            >
              <div style={{ textAlign: 'center', width: '44px', flex: 'none' }}>
                <div className="serif" style={{ fontSize: '30px', fontWeight: 700, lineHeight: 1 }}>
                  {entry.day}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>{entry.weekday}</div>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row" style={{ gap: '6px', fontSize: '12.5px', opacity: 0.85 }}>
                  <i className="dot" style={{ background: MOODS[entry.mood] }} />
                  {entry.mood}
                  <span style={{ marginLeft: 'auto' }} className="row">
                    {entry.status === 'priv' ? (
                      <>
                        <Icon name="lock" size={13} /> Chỉ mình tôi
                      </>
                    ) : entry.status === 'wait' ? (
                      <span className="badge b-wait" style={{ fontSize: '11px' }}>
                        Chờ duyệt công khai
                      </span>
                    ) : (
                      <>
                        <Icon name="globe" size={13} /> Công khai
                      </>
                    )}
                  </span>
                </div>
                <b style={{ display: 'block', fontSize: '16px', marginTop: '2px' }}>
                  {entry.title}
                </b>
                <div
                  style={{
                    fontSize: '13.5px',
                    opacity: 0.75,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {entry.excerpt}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Right Reading Notebook */}
      <div
        className="abs"
        style={{
          left: '480px',
          right: '30px',
          top: '100px',
          bottom: '30px',
          background: 'var(--paper)',
          color: 'var(--ink)',
          borderRadius: '6px 18px 18px 6px',
          boxShadow: '0 24px 50px rgba(0,0,0,.35)',
          padding: '34px 46px',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '14px',
            background: 'var(--acc)',
            borderRadius: '6px 0 0 6px',
          }}
        />

        <div className="row between">
          <div className="row muted" style={{ gap: '10px' }}>
            Thứ Bảy, {activeEntry.day}.10.2026 ·{' '}
            <i className="dot" style={{ background: MOODS[activeEntry.mood] }} /> {activeEntry.mood}
          </div>
          <span className="row muted" style={{ gap: '14px' }}>
            <span style={{ cursor: 'pointer' }} onClick={onOpenWriteModal}>
              <Icon name="edit" size={17} />
            </span>
            <Icon name="lock" size={17} /> Chỉ mình tôi
          </span>
        </div>

        <h2 style={{ fontSize: '36px', margin: '8px 0 10px' }}>
          {activeEntry.title}
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 250px', gap: '28px' }}>
          <div className="book" style={{ fontSize: '17px', lineHeight: '32px', whiteSpace: 'pre-line' }}>
            {activeEntry.fullStory || activeEntry.excerpt}
          </div>

          <div>
            <div
              style={{
                height: '180px',
                border: '8px solid #fff',
                boxShadow: '0 6px 16px rgba(0,0,0,.15)',
                transform: 'rotate(2deg)',
                overflow: 'hidden',
              }}
            >
              <Painting seed={44} kind="boat" />
            </div>
            <div className="hand muted" style={{ textAlign: 'center', marginTop: '10px', fontSize: '17px' }}>
              {activeEntry.caption || 'thư viện, chiều thứ bảy'}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default DiaryPersonal;
