import React, { useState } from 'react';
import { Painting } from '../../components/common/Painting';
import { ReactionStack, ReactionPicker } from '../../components/common/Reactions';
import { Icon } from '../../components/common/Icons';

export function ArtworkCard({ artwork, index, onClick, onSelectReaction }) {
  const [isHovered, setIsHovered] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState('HUG');

  // Pending Artwork State
  if (artwork.status === 'PENDING') {
    return (
      <article className="work pending" onClick={onClick}>
        <div className="art">
          <div>
            <Icon name="image" size={26} />
            <div style={{ marginTop: '6px' }}>Tranh minh họa đang được vẽ</div>
          </div>
        </div>
        <div className="cap">
          <h4>{artwork.t}</h4>
          <p>{artwork.s}</p>
          <div className="meta">
            <span className="badge b-wait">
              <Icon name="clock" size={13} /> Đang được chuẩn bị
            </span>
            <span>gửi {artwork.date || '25.10'}</span>
          </div>
        </div>
      </article>
    );
  }

  // Rejected Artwork State
  if (artwork.status === 'REJECTED') {
    return (
      <article className="work" onClick={onClick}>
        <div className="art" style={{ opacity: 0.55 }}>
          <Painting seed={900 + index} kind="rain" />
        </div>
        <div className="cap">
          <h4>{artwork.t}</h4>
          <p>Lý do: {artwork.reason || 'câu chuyện còn nhắc tên thật của một bạn khác.'}</p>
          <div className="meta">
            <span className="badge b-no">Chưa được trưng bày</span>
            <b style={{ color: 'var(--acc)', cursor: 'pointer' }}>Sửa và gửi lại →</b>
          </div>
        </div>
      </article>
    );
  }

  // Normal Artwork Card
  return (
    <article
      className={`work ${isHovered ? 'lift' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <div className="art">
        <Painting seed={100 + index * 7} kind={artwork.k || 'window'} />
      </div>

      <div className="cap">
        <h4>{artwork.t}</h4>
        <p>{artwork.s}</p>
        <div className="meta">
          <span className="by">{artwork.a}</span>
          <span className="row" style={{ gap: '12px' }}>
            <span className="rxs">
              <ReactionStack types={artwork.rx || ['HUG', 'HEART']} />
              <span>{artwork.n}</span>
            </span>
            <span className="row" style={{ gap: '4px' }}>
              <Icon name="eye" size={15} />
              {artwork.v}
            </span>
          </span>
        </div>
      </div>

      {isHovered && (
        <ReactionPicker
          activeType={selectedReaction}
          onSelect={(type) => {
            setSelectedReaction(type);
            onSelectReaction && onSelectReaction(artwork.id, type);
          }}
        />
      )}
    </article>
  );
}

export default ArtworkCard;
