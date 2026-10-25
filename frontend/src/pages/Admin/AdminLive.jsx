import React from 'react';
import { WORKS, ADMINS } from '../../data/mockData';
import { Painting } from '../../components/common/Painting';
import { ReactionStack } from '../../components/common/Reactions';
import { Icon } from '../../components/common/Icons';

export function AdminLive() {
  const stats = [
    { label: "Tác phẩm đang trưng bày", val: "1.284", sub: "+38 tuần này" },
    { label: "Lượt xem", val: "48,2k", sub: "+12% so với tuần trước" },
    { label: "Lượt thả cảm xúc", val: "9.731", sub: "Ôm an ủi nhiều nhất" },
    { label: "Thời gian duyệt trung bình", val: "5,2 giờ", sub: "Mục tiêu dưới 24 giờ" },
  ];

  return (
    <>
      {/* Stats Cards Grid */}
      <div
        className="abs"
        style={{
          left: '32px',
          right: '32px',
          top: '194px',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
        }}
      >
        {stats.map((s, idx) => (
          <div key={idx} className="box stat">
            <small>{s.label}</small>
            <b>{s.val}</b>
            <small>{s.sub}</small>
          </div>
        ))}
      </div>

      {/* Artworks Management Table */}
      <div
        className="abs box"
        style={{
          left: '32px',
          right: '32px',
          top: '330px',
          bottom: '26px',
          overflowY: 'auto',
        }}
      >
        <table className="at">
          <thead>
            <tr>
              <th style={{ width: '90px' }} />
              <th>Tác phẩm</th>
              <th>Bút danh</th>
              <th>Lượt xem</th>
              <th>Cảm xúc</th>
              <th>Duyệt bởi</th>
              <th style={{ width: '210px' }} />
            </tr>
          </thead>
          <tbody>
            {WORKS.slice(0, 6).map((w, i) => (
              <tr key={w.id || i}>
                <td>
                  <div
                    style={{
                      width: '70px',
                      height: '46px',
                      borderRadius: '6px',
                      overflow: 'hidden',
                    }}
                  >
                    <Painting seed={100 + i * 7} kind={w.k} />
                  </div>
                </td>
                <td>
                  <b>{w.t}</b>
                  <div className="muted" style={{ fontSize: '12.5px' }}>
                    trưng bày {21 - i}.10.2026
                  </div>
                </td>
                <td>{w.a}</td>
                <td>{w.v}</td>
                <td>
                  <span className="rxs">
                    <ReactionStack types={w.rx} size={18} />
                    <span>{w.n}</span>
                  </span>
                </td>
                <td>{ADMINS[i % 4].name}</td>
                <td>
                  <span className="row" style={{ gap: '8px' }}>
                    <button type="button" className="btn line sm">
                      <Icon name="edit" size={14} /> Sửa
                    </button>
                    <button type="button" className="btn line sm">
                      <Icon name="archive" size={14} /> Lưu trữ
                    </button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default AdminLive;
