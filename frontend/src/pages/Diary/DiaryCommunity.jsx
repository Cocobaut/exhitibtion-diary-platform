import React from 'react';
import { COMMUNITY_DIARY_ENTRIES, MOODS } from '../../data/mockData';
import { ReactionStack } from '../../components/common/Reactions';

export function DiaryCommunity() {
  const rotations = [-0.6, 0.5, -0.3, 0.4, -0.5, 0.3];

  return (
    <>
      <div className="abs" style={{ left: '30px', right: '30px', top: '96px' }}>
        <div className="muted" style={{ color: 'var(--onw2)', fontSize: '14px' }}>
          Những trang nhật ký các thành viên chọn chia sẻ và đã qua kiểm duyệt.
        </div>
      </div>

      <div
        className="abs"
        style={{
          left: '30px',
          right: '30px',
          top: '134px',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '24px',
          overflowY: 'auto',
          maxHeight: 'calc(100% - 150px)',
          paddingBottom: '30px',
        }}
      >
        {COMMUNITY_DIARY_ENTRIES.map((note, i) => (
          <div
            key={i}
            style={{
              background: 'var(--paper)',
              color: 'var(--ink)',
              borderRadius: '4px 14px 14px 4px',
              padding: '20px 22px 16px',
              boxShadow: '0 14px 30px rgba(0,0,0,.28)',
              transform: `rotate(${rotations[i % rotations.length]}deg)`,
              borderLeft: `8px solid ${MOODS[note.mood] || '#E2BC55'}`,
            }}
          >
            <div className="row muted" style={{ gap: '6px', fontSize: '12.5px' }}>
              <i className="dot" style={{ background: MOODS[note.mood] }} />
              {note.mood} · {note.date}
            </div>

            <b className="serif" style={{ display: 'block', fontSize: '22px', margin: '4px 0 6px' }}>
              {note.title}
            </b>

            <div className="book" style={{ fontSize: '15px', lineHeight: 1.7, height: '76px', overflow: 'hidden' }}>
              {note.excerpt}
            </div>

            <div
              className="row between"
              style={{
                marginTop: '10px',
                borderTop: '1px solid var(--line)',
                paddingTop: '8px',
              }}
            >
              <span className="hand" style={{ fontSize: '18px' }}>
                {note.author}
              </span>
              <span className="rxs">
                <ReactionStack types={['HUG', 'SYMPATHY']} size={20} />
                <span className="muted">{note.count}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default DiaryCommunity;
