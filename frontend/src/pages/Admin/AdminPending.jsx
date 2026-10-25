import React, { useState } from 'react';
import { PENDING_SUBMISSIONS } from '../../data/mockData';
import { Painting } from '../../components/common/Painting';
import { Icon } from '../../components/common/Icons';

export function AdminPending({ onOpenRejectModal }) {
  const [selectedId, setSelectedId] = useState(1);
  const [title, setTitle] = useState('Mùa thi đại học năm ấy');
  const [summary, setSummary] = useState('Mình đứng trước cổng trường thi cho tới khi người ta khoá cổng.');

  return (
    <>
      {/* Left Queue Box */}
      <div
        className="abs box"
        style={{
          left: '32px',
          top: '192px',
          width: '400px',
          bottom: '26px',
          overflowY: 'auto',
        }}
      >
        <div
          className="row between"
          style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}
        >
          <span className="muted">Cũ nhất trước</span>
          <span className="muted"><Icon name="filter" size={16} /></span>
        </div>

        {PENDING_SUBMISSIONS.map((item) => {
          const isSelected = selectedId === item.id;
          return (
            <div
              key={item.id}
              className={`qrow ${isSelected ? 'sel' : ''}`}
              onClick={() => setSelectedId(item.id)}
            >
              <div className="row between">
                <span className="muted">{item.time}</span>
                {item.lock ? (
                  <span className="badge b-priv">
                    <Icon name="eye" size={12} /> {item.lock}
                  </span>
                ) : item.flag ? (
                  <span className="badge b-arch">{item.flag}</span>
                ) : null}
              </div>
              <b>{item.title}</b>
              <div className="muted">{item.penName} · {item.username}</div>
            </div>
          );
        })}
      </div>

      {/* Right Review & Moderation Box */}
      <div
        className="abs box"
        style={{
          left: '452px',
          right: '32px',
          top: '142px',
          bottom: '26px',
          padding: '22px 26px',
          overflowY: 'auto',
        }}
      >
        <div className="row between">
          <div>
            <div className="muted">Gửi lúc 14:02 · @gio.nguyen · bút danh “Gió”</div>
            <div className="row" style={{ gap: '8px', marginTop: '4px' }}>
              <span className="badge b-wait">PENDING</span>
              <span className="muted" style={{ fontSize: '13px' }}>
                <Icon name="eye" size={13} /> An đang biên tập · bài được khoá cho An
              </span>
            </div>
          </div>

          <div className="row">
            <button
              type="button"
              className="btn danger"
              onClick={onOpenRejectModal}
            >
              <Icon name="x" size={16} /> Từ chối
            </button>
            <button type="button" className="btn line">
              Lưu nháp
            </button>
            <button type="button" className="btn main">
              <Icon name="check" size={16} /> Phê duyệt & trưng bày
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 330px',
            gap: '26px',
            marginTop: '16px',
          }}
        >
          {/* Editor fields */}
          <div>
            <div className="fieldl">Tiêu đề</div>
            <input className="inp" value={title} onChange={(e) => setTitle(e.target.value)} />

            <div className="fieldl">
              Tóm tắt trên thẻ <span>{summary.length} / 120</span>
            </div>
            <input className="inp" value={summary} onChange={(e) => setSummary(e.target.value)} />

            <div className="fieldl">
              Nội dung đầy đủ <span>Admin được sửa câu chữ</span>
            </div>
            <div
              className="inp area"
              style={{ minHeight: '250px', fontSize: '15px' }}
              contentEditable
              suppressContentEditableWarning
            >
              Sáng hôm đó mình dậy sớm hơn mọi ngày. Mình đã ôn suốt một năm, vậy mà khi cầm đề lên, mình không nhớ nổi công thức đầu tiên.{' '}
              <span style={{ background: '#F6DCD7', textDecoration: 'line-through' }}>
                Cô Hằng lớp 12A3 trường Lê Quý Đôn
              </span>{' '}
              <span style={{ background: '#DDEBD8' }}>Cô giáo chủ nhiệm</span> đã gọi cho mình tối hôm đó…
            </div>
            <div className="muted" style={{ fontSize: '13px', marginTop: '6px' }}>
              Đã bỏ 1 chi tiết nhận dạng · thay đổi được lưu vào nhật ký quản trị
            </div>
          </div>

          {/* Painting & Wall preview */}
          <div>
            <div className="fieldl">
              Tranh minh họa <span style={{ color: 'var(--acc)' }}>Bắt buộc ở Phòng 1</span>
            </div>
            <div style={{ height: '210px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--line)' }}>
              <Painting seed={77} kind="door" />
            </div>
            <div className="row" style={{ gap: '8px', marginTop: '10px' }}>
              <button type="button" className="btn line sm">
                <Icon name="upload" size={15} /> Tải ảnh khác
              </button>
              <button type="button" className="btn line sm">
                <Icon name="sparkle" size={15} /> Tạo bằng Gemini
              </button>
            </div>

            <div className="fieldl" style={{ marginTop: '18px' }}>
              Xem trước trên tường
            </div>
            <div style={{ background: 'var(--wall)', borderRadius: '12px', padding: '16px 26px' }}>
              <article className="work" style={{ transform: 'scale(.92)', transformOrigin: 'top center', marginBottom: '-26px' }}>
                <div className="art" style={{ height: '120px' }}>
                  <Painting seed={77} kind="door" />
                </div>
                <div className="cap">
                  <h4>{title}</h4>
                  <p style={{ height: 'auto' }}>{summary}</p>
                </div>
              </article>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default AdminPending;
