import React, { useState } from 'react';
import { Icon } from '../../components/common/Icons';
import { ReactionButton } from '../../components/common/Reactions';
import { leafPath } from './WishTree';

export function ReadLeafModal({ isOpen, onClose }) {
  const [energyCount, setEnergyCount] = useState(86);
  const [heartCount, setHeartCount] = useState(214);
  const [hasEnergized, setHasEnergized] = useState(true);
  const [hasHearted, setHasHearted] = useState(false);

  if (!isOpen) return null;

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div
        className="panel"
        style={{ width: '540px', textAlign: 'center', background: '#F7F5EC' }}
      >
        <span className="x" onClick={onClose} role="button" tabIndex={0}>
          <Icon name="x" size={22} />
        </span>

        {/* Leaf illustration */}
        <svg
          width="160"
          height="90"
          viewBox="0 0 160 90"
          style={{ display: 'block', margin: '0 auto' }}
        >
          <g transform="translate(14 50) rotate(-10)">
            <path d={leafPath(130, 40)} fill="#94C590" />
            <path d="M6 0 H120" stroke="#5E8F5A" strokeWidth="1.5" />
          </g>
        </svg>

        <div
          className="row"
          style={{
            justifyContent: 'center',
            gap: '6px',
            fontSize: '13.5px',
            color: '#4E7A4A',
            marginTop: '4px',
          }}
        >
          <i className="dot" style={{ background: '#94C590' }} />
          Chữa lành · lời bình an tâm hồn
        </div>

        <h2 style={{ marginTop: '6px' }}>Gửi bạn đang mệt mỏi</h2>

        <div
          className="hand"
          style={{ fontSize: '27px', lineHeight: 1.45, margin: '12px 0 8px' }}
        >
          Hôm nay nghỉ ngơi cũng là một cách cố gắng. Cái cây cũng đâu ra lá quanh năm.
        </div>

        <div className="muted">Mây · treo lên cây ngày 18.10.2026</div>

        <div
          className="row"
          style={{ justifyContent: 'center', marginTop: '20px', gap: '10px' }}
        >
          <ReactionButton
            type="ENERGY"
            count={energyCount}
            active={hasEnergized}
            onClick={() => {
              setHasEnergized(!hasEnergized);
              setEnergyCount(hasEnergized ? energyCount - 1 : energyCount + 1);
            }}
          />

          <ReactionButton
            type="HEART"
            count={heartCount}
            active={hasHearted}
            onClick={() => {
              setHasHearted(!hasHearted);
              setHeartCount(hasHearted ? heartCount - 1 : heartCount + 1);
            }}
          />
        </div>

        <div className="muted" style={{ fontSize: '13px', marginTop: '14px' }}>
          Lời nhắn này cũng có trong hòm thư ở sảnh chính.
        </div>
      </div>
    </>
  );
}

export default ReadLeafModal;
