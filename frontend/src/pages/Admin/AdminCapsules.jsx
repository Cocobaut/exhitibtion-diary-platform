import React, { useState } from 'react';
import { CAPSULES_POOL } from '../../data/mockData';
import { Icon } from '../../components/common/Icons';

export function AdminCapsules() {
  const [capsules, setCapsules] = useState(CAPSULES_POOL);
  const [selectedTopic, setSelectedTopic] = useState('Góc nhìn');
  const [newContent, setNewContent] = useState('Bạn có thể bắt đầu lại bao nhiêu lần cũng được.');
  const [activeImmediately, setActiveImmediately] = useState(true);

  const toggleActive = (id) => {
    setCapsules(
      capsules.map((c) => (c.id === id ? { ...c, active: !c.active } : c))
    );
  };

  const handleAddCapsule = () => {
    if (!newContent.trim()) return;
    const newCap = {
      id: Date.now(),
      content: newContent,
      topic: selectedTopic,
      source: 'Admin · An',
      draws: 0,
      active: activeImmediately,
    };
    setCapsules([newCap, ...capsules]);
    setNewContent('');
  };

  return (
    <>
      {/* Capsules Table Box */}
      <div
        className="abs box"
        style={{
          left: '32px',
          right: '420px',
          top: '194px',
          bottom: '26px',
          overflowY: 'auto',
        }}
      >
        <table className="at">
          <thead>
            <tr>
              <th>Thông điệp</th>
              <th>Chủ đề</th>
              <th>Nguồn</th>
              <th>Lượt rút</th>
              <th>Bật</th>
            </tr>
          </thead>
          <tbody>
            {capsules.map((c) => (
              <tr key={c.id}>
                <td style={{ maxWidth: '360px' }}>{c.content}</td>
                <td>
                  <span
                    className={`badge ${
                      c.topic === 'Can đảm'
                        ? 'b-wait'
                        : c.topic === 'Chữa lành'
                        ? 'b-ok'
                        : 'b-priv'
                    }`}
                  >
                    {c.topic}
                  </span>
                </td>
                <td className="muted">{c.source}</td>
                <td>{c.draws}</td>
                <td>
                  <span
                    className={`tog ${c.active ? 'on' : ''}`}
                    onClick={() => toggleActive(c.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Right Add Capsule Box */}
      <div
        className="abs box"
        style={{
          right: '32px',
          width: '368px',
          top: '194px',
          padding: '20px 22px',
        }}
      >
        <b className="serif" style={{ fontSize: '22px' }}>
          Thêm thông điệp
        </b>

        <div className="fieldl">Chủ đề</div>
        <div className="row" style={{ gap: '6px' }}>
          {["Can đảm", "Chữa lành", "Góc nhìn"].map((t) => (
            <span
              key={t}
              className={`ichip ${selectedTopic === t ? 'on' : ''}`}
              onClick={() => setSelectedTopic(t)}
            >
              {t}
            </span>
          ))}
        </div>

        <div className="fieldl">Nội dung</div>
        <textarea
          className="inp area"
          style={{ minHeight: '110px', fontSize: '15px' }}
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
        />

        <div className="row between" style={{ marginTop: '14px' }}>
          <span
            className="row muted"
            style={{ gap: '8px', cursor: 'pointer' }}
            onClick={() => setActiveImmediately(!activeImmediately)}
          >
            <span className={`tog ${activeImmediately ? 'on' : ''}`} /> Bật ngay
          </span>
          <button type="button" className="btn main sm" onClick={handleAddCapsule}>
            Lưu vào kho
          </button>
        </div>
      </div>
    </>
  );
}

export default AdminCapsules;
