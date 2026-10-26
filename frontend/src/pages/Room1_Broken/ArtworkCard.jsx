import React, { useState } from 'react';
import { Painting } from '../../components/common/Painting';
import { ReactionStack, ReactionPicker } from '../../components/common/Reactions';
import { Icon } from '../../components/common/Icons';

export function ArtworkCard({ artwork, index, onClick, onSelectReaction }) {
  const [isHovered, setIsHovered] = useState(false);

  const title = artwork.title || artwork.t || 'Chưa có tiêu đề';
  const summary = artwork.short_content || artwork.summary || artwork.s || '';
  const author = artwork.author_display_name || artwork.a || (artwork.is_anonymous ? 'Ẩn danh' : 'Tác giả');
  const viewCount = artwork.view_count !== undefined ? artwork.view_count : (artwork.v || 0);

  const totalReactions =
    artwork.reactions?.total !== undefined
      ? artwork.reactions.total
      : artwork.total_reactions !== undefined
      ? artwork.total_reactions
      : artwork.n || 0;

  const stackTypes = artwork.reactions
    ? ['HUG', 'HEART', 'SYMPATHY'].filter((k) => artwork.reactions[k] > 0)
    : artwork.rx || ['HUG', 'HEART'];

  const userReaction = artwork.my_reaction || artwork.user_reaction || 'HUG';

  // Format view count (ví dụ: 1200 -> 1,2k)
  const formatViews = (cnt) => {
    if (cnt >= 1000) return `${(cnt / 1000).toFixed(1).replace('.0', '')}k`;
    return cnt;
  };

  // Pending Artwork State (C6)
  if (artwork.status === 'PENDING') {
    return (
      <article className="work pending" onClick={onClick} style={{ cursor: 'pointer' }}>
        <div className="art">
          <div>
            <Icon name="image" size={26} />
            <div style={{ marginTop: '6px' }}>Tranh minh họa đang được vẽ</div>
          </div>
        </div>
        <div className="cap">
          <h4>{title}</h4>
          <p>{summary}</p>
          <div className="meta">
            <span className="badge b-wait">
              <Icon name="clock" size={13} /> Đang được chuẩn bị
            </span>
            <span>{artwork.created_at ? new Date(artwork.created_at).toLocaleDateString('vi-VN') : 'gửi hôm nay'}</span>
          </div>
        </div>
      </article>
    );
  }

  // Rejected Artwork State (C6)
  if (artwork.status === 'REJECTED') {
    return (
      <article className="work" onClick={onClick} style={{ cursor: 'pointer' }}>
        <div className="art" style={{ opacity: 0.55 }}>
          <Painting seed={900 + (index || 0)} kind="rain" />
        </div>
        <div className="cap">
          <h4>{title}</h4>
          <p>Lý do: {artwork.rejection_reason || artwork.reason || 'câu chuyện chưa phù hợp với tiêu chuẩn bảo tàng.'}</p>
          <div className="meta">
            <span className="badge b-priv">Chưa được trưng bày</span>
            <b style={{ color: 'var(--acc)', cursor: 'pointer' }}>Sửa và gửi lại →</b>
          </div>
        </div>
      </article>
    );
  }

  // Normal Artwork Card (C1)
  return (
    <article
      className={`work ${isHovered ? 'lift' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      style={{ cursor: 'pointer', position: 'relative' }}
    >
      <div className="art">
        {artwork.media_url || artwork.image_url ? (
          <img
            src={artwork.media_url || artwork.image_url}
            alt={title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Painting seed={100 + (index || 0) * 7} kind={artwork.k || 'window'} />
        )}
      </div>

      <div className="cap">
        <h4>{title}</h4>
        <p>{summary}</p>
        <div className="meta">
          <span className="by">{author}</span>
          <span className="row" style={{ gap: '12px' }}>
            <span className="rxs">
              <ReactionStack types={stackTypes.length > 0 ? stackTypes : ['HUG']} />
              <span>{totalReactions}</span>
            </span>
            <span className="row" style={{ gap: '4px' }}>
              <Icon name="eye" size={15} />
              {formatViews(viewCount)}
            </span>
          </span>
        </div>
      </div>

      {isHovered && (
        <ReactionPicker
          activeType={userReaction}
          onSelect={(type) => {
            onSelectReaction && onSelectReaction(artwork.id, type);
          }}
        />
      )}
    </article>
  );
}

export default ArtworkCard;
