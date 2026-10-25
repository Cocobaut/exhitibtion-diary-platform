import React, { useState } from 'react';
import { Painting } from '../../components/common/Painting';
import { ReactionButton } from '../../components/common/Reactions';
import { Icon } from '../../components/common/Icons';

export function ArtworkDetailModal({ isOpen, onClose, artwork }) {
  const [activeReaction, setActiveReaction] = useState('HUG');

  if (!isOpen || !artwork) return null;

  const reactionCounts = artwork.reactionsBreakdown || [61, 118, 35];
  const reactionTypes = ['HEART', 'HUG', 'SYMPATHY'];

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div
        className="panel"
        style={{
          width: '1060px',
          padding: 0,
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: '500px 1fr',
        }}
      >
        {/* Left: Large Framed Painting */}
        <div
          style={{
            background: '#2B211D',
            padding: '28px',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <div
            style={{
              width: '440px',
              height: '540px',
              border: '10px solid #F3EADD',
              boxShadow: '0 20px 40px rgba(0,0,0,.4)',
              overflow: 'hidden',
            }}
          >
            <Painting seed={100 + (artwork.id || 1) * 7} kind={artwork.k || 'window'} />
          </div>
        </div>

        {/* Right: Story & Details */}
        <div style={{ padding: '30px 36px 26px', position: 'relative' }}>
          <span className="x" onClick={onClose} role="button" tabIndex={0}>
            <Icon name="x" size={22} />
          </span>

          <div
            style={{
              fontFamily: 'var(--serif)',
              letterSpacing: '.24em',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--acc)',
            }}
          >
            PHÒNG 01 · TRIỂN LÃM ĐỔ VỠ
          </div>

          <h2 style={{ fontSize: '38px', marginTop: '6px' }}>{artwork.t}</h2>

          <div className="row muted" style={{ gap: '14px', margin: '4px 0 16px' }}>
            <span className="hand" style={{ fontSize: '20px', color: 'var(--ink)' }}>
              {artwork.a}
            </span>
            <span>trưng bày {artwork.date || '21.10.2026'}</span>
            <span className="row" style={{ gap: '4px' }}>
              <Icon name="eye" size={15} /> {artwork.v} lượt xem
            </span>
          </div>

          <div
            className="book"
            style={{ fontSize: '16.5px', lineHeight: 1.8, whiteSpace: 'pre-line' }}
          >
            {artwork.story || artwork.s}
          </div>

          {artwork.quote && (
            <div
              style={{
                fontFamily: 'var(--serif)',
                fontStyle: 'italic',
                fontSize: '22px',
                color: 'var(--acc)',
                margin: '16px 0 20px',
              }}
            >
              {artwork.quote}
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
            <div className="rxbar">
              {reactionTypes.map((type, idx) => (
                <ReactionButton
                  key={type}
                  type={type}
                  count={reactionCounts[idx]}
                  active={activeReaction === type}
                  onClick={() => setActiveReaction(type)}
                />
              ))}
            </div>
            <div className="muted" style={{ marginTop: '10px' }}>
              Bạn và {artwork.n || 213} người khác đã để lại cảm xúc.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default ArtworkDetailModal;
