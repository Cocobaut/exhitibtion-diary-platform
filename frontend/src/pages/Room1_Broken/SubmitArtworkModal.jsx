import React, { useState } from 'react';
import { Icon } from '../../components/common/Icons';

export function SubmitArtworkModal({ isOpen, onClose, onSubmit }) {
  const [title, setTitle] = useState('Mùa thi đại học năm ấy');
  const [penName, setPenName] = useState('Gió');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [summary, setSummary] = useState('Mình đứng trước cổng trường thi cho tới khi người ta khoá cổng.');
  const [story, setStory] = useState(
    'Sáng hôm đó mình dậy sớm hơn mọi ngày. Mình đã ôn suốt một năm, vậy mà khi cầm đề lên, mình không nhớ nổi công thức đầu tiên'
  );

  if (!isOpen) return null;

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div
        className="panel"
        style={{
          width: '1080px',
          display: 'grid',
          gridTemplateColumns: '1fr 330px',
          gap: '34px',
        }}
      >
        <span className="x" onClick={onClose} role="button" tabIndex={0}>
          <Icon name="x" size={22} />
        </span>

        {/* Form Fields */}
        <div>
          <h2>Trưng bày tác phẩm</h2>
          <div className="sub">
            Kể lại một lần vấp ngã. Đội ngũ sẽ đọc, vẽ tranh minh họa và treo tác phẩm lên tường cho bạn.
          </div>

          <div className="fieldl">Tiêu đề</div>
          <input
            className="inp"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: '16px',
              alignItems: 'end',
            }}
          >
            <div>
              <div className="fieldl">Bút danh cho tác phẩm này</div>
              <input
                className="inp"
                value={isAnonymous ? 'Ẩn danh' : penName}
                disabled={isAnonymous}
                onChange={(e) => setPenName(e.target.value)}
              />
            </div>
            <div className="row" style={{ height: '46px' }}>
              <span
                className={`tog ${isAnonymous ? 'on' : ''}`}
                onClick={() => setIsAnonymous(!isAnonymous)}
              />
              <span className="muted" style={{ color: 'var(--ink)' }}>Ẩn danh</span>
            </div>
          </div>

          <div className="fieldl">
            Tóm tắt hiển thị trên thẻ <span>{summary.length} / 120</span>
          </div>
          <input
            className="inp"
            value={summary}
            maxLength={120}
            onChange={(e) => setSummary(e.target.value)}
          />

          <div className="fieldl">Câu chuyện đầy đủ</div>
          <textarea
            className="inp area focus"
            style={{ minHeight: '150px' }}
            value={story}
            onChange={(e) => setStory(e.target.value)}
          />

          <div className="row between" style={{ marginTop: '18px' }}>
            <span className="muted" style={{ maxWidth: '420px', display: 'flex', gap: '6px', alignItems: 'center' }}>
              <Icon name="shield" size={15} />
              Mọi tác phẩm đều được đội ngũ đọc và bỏ chi tiết nhận dạng trước khi trưng bày.
            </span>
            <span className="row">
              <button type="button" className="btn ghost" onClick={onClose}>
                Huỷ
              </button>
              <button
                type="button"
                className="btn main"
                onClick={() =>
                  onSubmit &&
                  onSubmit({
                    title,
                    penName: isAnonymous ? 'Ẩn danh' : penName,
                    isAnonymous,
                    summary,
                    story,
                  })
                }
              >
                Trưng bày
              </button>
            </span>
          </div>
        </div>

        {/* Right Preview Card */}
        <div style={{ paddingTop: '40px' }}>
          <div className="muted" style={{ marginBottom: '10px' }}>
            Thẻ của bạn sẽ trông như thế này
          </div>
          <div style={{ '--paper': '#F3EADD' }}>
            <article className="work pending">
              <div className="art">
                <div>
                  <Icon name="image" size={26} />
                  <div style={{ marginTop: '6px' }}>Tranh minh họa đang được vẽ</div>
                </div>
              </div>
              <div className="cap">
                <h4>{title || 'Tiêu đề tác phẩm'}</h4>
                <p>{summary || 'Tóm tắt câu chuyện...'}</p>
                <div className="meta">
                  <span className="badge b-wait">
                    <Icon name="clock" size={13} /> Đang được chuẩn bị
                  </span>
                  <span>gửi hôm nay</span>
                </div>
              </div>
            </article>
          </div>
          <div className="muted" style={{ fontSize: '13px', marginTop: '12px' }}>
            Tranh minh họa do admin vẽ hoặc tạo bằng AI dựa trên câu chuyện của bạn.
          </div>
        </div>
      </div>
    </>
  );
}

export default SubmitArtworkModal;
