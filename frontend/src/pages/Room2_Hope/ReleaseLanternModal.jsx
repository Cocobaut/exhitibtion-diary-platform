import React, { useState } from 'react';
import { Icon } from '../../components/common/Icons';
import { SYM, SYM_KEYS } from '../../data/mockData';
import { poly } from './LanternSky';

export function ReleaseLanternModal({ isOpen, onClose, onRelease }) {
  const [title, setTitle] = useState('Gửi mình của năm 2030');
  const [message, setMessage] = useState(
    'Hôm nay mình vừa trượt vòng phỏng vấn thứ ba. Mình viết lá thư này để cậu nhớ rằng đã có lúc mọi thứ thật khó, và mình vẫn đi tiếp'
  );
  const [penName, setPenName] = useState('Linh của năm 2026');
  const [selectedSymbol, setSelectedSymbol] = useState('heart');
  const [isPrivate, setIsPrivate] = useState(true);
  const [selectedDay, setSelectedDay] = useState(24);
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [quickYear, setQuickYear] = useState('4 năm');

  if (!isOpen) return null;

  const days = [];
  days.push('');
  for (let d = 1; d <= 31; d++) days.push(d);

  return (
    <>
      <div className="scrim" style={{ background: 'rgba(20,8,12,.5)' }} onClick={onClose} />
      <div
        className="panel"
        style={{
          width: '1040px',
          display: 'grid',
          gridTemplateColumns: '1fr 390px',
          gap: '30px',
        }}
      >
        <span className="x" onClick={onClose} role="button" tabIndex={0}>
          <Icon name="x" size={22} />
        </span>

        {/* Left Side: Content & Privacy */}
        <div>
          <h2>Thả lồng đèn tương lai</h2>
          <div className="sub">Viết cho chính mình, hẹn ngày giờ lồng đèn hạ xuống.</div>

          <div className="fieldl">Tiêu đề</div>
          <input className="inp" value={title} onChange={(e) => setTitle(e.target.value)} />

          <div className="fieldl">Lời gửi tương lai</div>
          <textarea
            className="inp area focus"
            style={{ minHeight: '180px' }}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <div className="fieldl">Bút danh</div>
              <input className="inp" value={penName} onChange={(e) => setPenName(e.target.value)} />
            </div>

            <div>
              <div className="fieldl">Biểu tượng trên đèn</div>
              <div className="row" style={{ height: '46px', gap: '6px' }}>
                {SYM_KEYS.map((k) => {
                  const sym = SYM[k]().map(([a, b]) => [a * 10, b * 10]);
                  const isSelected = selectedSymbol === k;
                  return (
                    <span
                      key={k}
                      onClick={() => setSelectedSymbol(k)}
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        display: 'grid',
                        placeItems: 'center',
                        border: isSelected ? '2px solid var(--acc)' : '1px solid var(--line)',
                        background: '#FFFDF9',
                        cursor: 'pointer',
                      }}
                    >
                      <svg width="22" height="22" viewBox="-12 -13 24 24">
                        <path
                          d={poly(sym)}
                          fill="none"
                          stroke="#7F1916"
                          strokeWidth="1.8"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="fieldl">Ai được thấy lồng đèn này?</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div
              className={`opt ${isPrivate ? 'on' : ''}`}
              onClick={() => setIsPrivate(true)}
            >
              <b><Icon name="lock" size={17} /> Riêng tư</b>
              <div className="muted">Chỉ bạn thấy. Không cần duyệt, bay lên ngay.</div>
            </div>
            <div
              className={`opt ${!isPrivate ? 'on' : ''}`}
              onClick={() => setIsPrivate(false)}
            >
              <b><Icon name="globe" size={17} /> Công khai</b>
              <div className="muted">Admin duyệt rồi thả lên bầu trời chung.</div>
            </div>
          </div>
        </div>

        {/* Right Side: Calendar & Target Date */}
        <div style={{ paddingTop: '56px' }}>
          <div className="fieldl" style={{ marginTop: 0 }}>Ngày & giờ hạ xuống</div>

          {/* Calendar widget */}
          <div style={{ background: '#FFFDF9', border: '1px solid var(--line)', borderRadius: '14px', padding: '12px 14px' }}>
            <div className="row between" style={{ marginBottom: '6px' }}>
              <b>Tháng 10, 2030</b>
              <span className="row muted" style={{ gap: '8px' }}>
                <span style={{ transform: 'rotate(180deg)', display: 'inline-flex' }}>
                  <Icon name="chev" size={16} />
                </span>
                <Icon name="chev" size={16} />
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px', textAlign: 'center', fontSize: '13px' }}>
              {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
                <span key={d} className="muted" style={{ fontSize: '11.5px' }}>{d}</span>
              ))}
              {days.map((d, idx) => (
                <span
                  key={idx}
                  onClick={() => d && setSelectedDay(d)}
                  style={{
                    padding: '5px 0',
                    borderRadius: '8px',
                    cursor: d ? 'pointer' : 'default',
                    background: d === selectedDay ? 'var(--acc)' : 'transparent',
                    color: d === selectedDay ? '#fff' : 'inherit',
                    fontWeight: d === selectedDay ? 600 : 'normal',
                  }}
                >
                  {d}
                </span>
              ))}
            </div>
          </div>

          <div className="row" style={{ gap: '10px', marginTop: '12px' }}>
            <div className="inp row" style={{ gap: '8px', flex: 1 }}>
              <Icon name="calendar" size={17} /> {selectedDay}.10.2030
            </div>
            <div className="inp row" style={{ gap: '8px', width: '130px' }}>
              <Icon name="clock" size={17} /> {selectedTime} <Icon name="down" size={14} />
            </div>
          </div>

          <div className="row" style={{ gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
            {["1 năm nữa", "3 năm", "4 năm", "Sinh nhật tới"].map((t) => (
              <span
                key={t}
                className={`ichip ${quickYear === t ? 'on' : ''}`}
                onClick={() => setQuickYear(t)}
              >
                {t}
              </span>
            ))}
          </div>

          <div className="muted" style={{ fontSize: '13px', marginTop: '12px' }}>
            Đúng {selectedTime} ngày {selectedDay}.10.2030, lồng đèn sẽ hạ xuống và bạn nhận thông báo trong hộp thư.
          </div>

          <div className="row" style={{ justifyContent: 'flex-end', marginTop: '22px' }}>
            <button type="button" className="btn ghost" onClick={onClose}>
              Huỷ
            </button>
            <button
              type="button"
              className="btn main"
              onClick={() => {
                onRelease &&
                  onRelease({
                    title,
                    message,
                    penName,
                    selectedSymbol,
                    isPrivate,
                    targetDate: `${selectedDay}.10.2030 ${selectedTime}`,
                  });
                onClose();
              }}
            >
              <Icon name="r2" size={17} /> Thả lồng đèn
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default ReleaseLanternModal;
