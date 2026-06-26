import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
// 🔹 Import ตัวเจน QR Code เข้ามาใช้งาน
import { QRCodeSVG } from 'qrcode.react';

export default function GodexPrintButton({ form }) {
  const printAreaRef = useRef(null);

  const handlePrint = () => {
    const printContent = printAreaRef.current.innerHTML;
    const originalContent = document.body.innerHTML;

    document.body.innerHTML = printContent;
    window.print();
    
    document.body.innerHTML = originalContent;
    window.location.reload(); 
  };

  return (
    <>
      {/* 1. ปุ่มกดสไตล์เดิม */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 gap-1.5 text-xs font-semibold border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
        onClick={handlePrint}
      >
        <Printer size={13} />
        <span>พิมพ์สติกเกอร์</span>
      </Button>

      {/* 2. ฟอร์มดีไซน์สติกเกอร์ (ซ่อนไว้บนหน้าเว็บปกติ จะแสดงผลเฉพาะตอนกดพิมพ์) */}
      <div style={{ display: 'none' }}>
        <div ref={printAreaRef}>
          <style>{`
            @media print {
              @page {
                size: 76mm 50mm; /* ขนาดสติกเกอร์ กว้าง 7.6 ซม. สูง 5 ซม. */
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
                background: #fff;
                -webkit-print-color-adjust: exact;
              }
              .sticker-container {
                width: 76mm;
                height: 50mm;
                padding: 5mm;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                font-family: 'Inter', sans-serif, "Helvetica Neue", "Tahoma";
                color: #000;
              }
              .sticker-header {
                font-size: 13px;
                font-weight: bold;
                border-bottom: 2px solid #000;
                padding-bottom: 3px;
                letter-spacing: 0.5px;
                text-align: center;
              }
              .sticker-content {
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-grow: 1;
                margin-top: 5px;
                gap: 10px;
              }
              .sticker-details {
                font-size: 11px;
                line-height: 1.4;
                display: flex;
                flex-direction: column;
                justify-content: center;
                max-width: 65%;
              }
              .detail-item {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }
              .qr-zone {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-width: 30%;
              }
              .asset-tag-text {
                font-size: 11px;
                font-weight: bold;
                font-family: monospace;
                margin-top: 4px;
                letter-spacing: 0.5px;
              }
            }
          `}</style>

          {/* โครงสร้างเลย์เอาท์หน้าตาของตัวสติกเกอร์ */}
          <div className="sticker-container">
            <div className="sticker-header">
              🏢 IT ASSET MANAGEMENT
            </div>
            <div className="sticker-content">
              <div className="sticker-details">
                <div className='detail-item'><strong>รหัสอุปกรณ์ : </strong>{form?.asset_tag}</div>
                <div className="detail-item"><strong>ชื่ออุปกรณ์ : </strong> {form?.name || '—'}</div>
                <div className="detail-item"><strong>แผนก : </strong> {form?.department || '—'}</div>
                <div className="detail-item"><strong>ประเภท : </strong> {form?.category || '—'}</div>
                <div className='detail-item'><strong>วันหมดประกัน : </strong>{form?.purchase_date}</div>
              </div>

              {/* ฝั่งขวา: เจนรูป QR Code จากรหัส Asset Tag */}
              <div className="qr-zone">
                <QRCodeSVG 
                  value={form?.asset_tag || "000000"} 
                  size={75} // ขนาดความกว้าง-สูงของ QR Code เป็นพิกเซล (พอดีกับสติกเกอร์ 50mm)
                  level={"M"} // ระดับการฟื้นฟูข้อมูลมาตรฐาน (Medium) ช่วยให้สแกนง่ายขึ้นแม้พิมพ์บนสติกเกอร์ด่วน
                />
                {/* <div className="asset-tag-text">{form?.asset_tag || '000000'}</div> */}
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}