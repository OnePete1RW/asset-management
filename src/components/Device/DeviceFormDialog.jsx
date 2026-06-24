import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase'; 
import ImageCropDialog from './ImageCropDialog'; 
import ImageUploader from './ImageUploader';

export default function DeviceFormDialog({
  isOpen,
  setIsOpen,
  form,
  setForm,
  errors,
  setErrors,
  focusField,
  setFocusField,
  saving,
  handleSave, 
  setCloseConfirmOpen,
  categories,
  statuses,
  departments
}) {
  // สเตตัสสำหรับหน้าต่างตัดรูปภาพ
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);

  // ฟังก์ชันเมื่อเลือกรูปหรือลากรูปมาวาง
  const handleImageChangeLocal = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
  };

  // ฟังก์ชันคำนวณการตัดรูปภาพพิกเซลจริง และส่งเข้า Supabase
  const saveCropLocal = async () => {
    if (!croppedAreaPixels || !imageSrc) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 300;
    canvas.height = 300;

    const image = new Image();
    image.src = imageSrc;

    image.onload = async () => {
      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        300,
        300
      );

      canvas.toBlob(async (blob) => {
        const fileName = `${Date.now()}.png`;
        const { error } = await supabase.storage
          .from("device-images")
          .upload(fileName, blob);

        if (error) {
          alert("อัปโหลดรูปภาพล้มเหลว: " + error.message);
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from("device-images")
          .getPublicUrl(fileName);

        setForm(f => ({ ...f, image_url: publicUrl }));
        setCropDialogOpen(false);
      });
    };
  };

  // 🛠️ ฟังก์ชันตรวจสอบข้อมูลอย่างละเอียด "ครบทุกฟิลด์"
  const validateAndSave = () => {
    const localErrors = {};

    if (!form.asset_tag || form.asset_tag.toString().trim() === "") {
      localErrors.asset_tag = "กรุณากรอกรหัสอุปกรณ์";
    }
    if (!form.name || form.name.trim() === "") {
      localErrors.name = "กรุณากรอกชื่ออุปกรณ์";
    }
    if (!form.category || form.category.trim() === "") {
      localErrors.category = "กรุณาเลือกประเภทอุปกรณ์";
    }
    if (!form.status || form.status.trim() === "") {
      localErrors.status = "กรุณาเลือกสถานะ";
    }
    if (!form.assigned_to || form.assigned_to.trim() === "") {
      localErrors.assigned_to = "กรุณากรอกผู้รับผิดชอบ";
    }
    if (!form.department || form.department.trim() === "") {
      localErrors.department = "กรุณาเลือกแผนก";
    }

    if (form.purchase_date && form.warranty_expire) {
      const purchase = new Date(form.purchase_date);
      const expire = new Date(form.warranty_expire);

      if (purchase > expire) {
        localErrors.warranty_expire = "วันหมดประกันต้องอยู่หลังจากวันที่ซื้อ";
      }
    }

    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return; 
    }

    handleSave();
  };

  // 🧹 ฟังก์ชันจัดการเมื่อกดยกเลิก เพื่อปิดฟอร์มและล้างประวัติ Error ออกให้เกลี้ยง
  const handleCancel = () => {
    setErrors({}); // ล้างแจ้งเตือนสีแดงทั้งหมด
    const hasData = Object.values(form).some(value => value && value.toString().trim() !== "");
    if (hasData) {
      setCloseConfirmOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setErrors({}); // ล้าง Error ทันทีเมื่อ Dialog ถูกสั่งปิด
          setCloseConfirmOpen(true);
        }
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>เพิ่มอุปกรณ์ใหม่</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div>
            <ImageUploader 
              imageUrl={form.image_url} 
              onImageChange={handleImageChangeLocal} 
            />
          </div>

          {/* Row 1 */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className={errors.asset_tag ? "text-red-500" : ""}>รหัสอุปกรณ์</Label>
              <Input
                value={form.asset_tag || ""}
                placeholder={focusField === "asset_tag" ? "" : errors.asset_tag ? errors.asset_tag : "เช่น ASSET-001"}
                className={errors.asset_tag ? "border-red-500 placeholder:text-red-500" : ""}
                onFocus={() => {
                  setFocusField("asset_tag");
                  setErrors(prev => ({ ...prev, asset_tag: "" }));
                }}
                onBlur={() => setFocusField("")}
                onChange={(e) => setForm(f => ({ ...f, asset_tag: e.target.value }))}
              />
              {/* 🏷️ จองพื้นที่แจ้งเตือนความสูงคงที่ (min-h-[20px]) ป้องกัน UI กระตุก */}
              <div className="min-h-[20px] mt-1">
                {errors.asset_tag && <p className="text-[11px] text-red-500">{errors.asset_tag}</p>}
              </div>
            </div>

            <div>
              <Label className={errors.name ? "text-red-500" : ""}>ชื่ออุปกรณ์</Label>
              <Input
                value={form.name || ""}
                placeholder={focusField === "name" ? "" : errors.name ? errors.name : "เช่น Laptop Dell XPS 13"}
                className={errors.name ? "border-red-500 placeholder:text-red-500" : ""}
                onFocus={() => {
                  setFocusField("name");
                  setErrors(prev => ({ ...prev, name: "" }));
                }}
                onBlur={() => setFocusField("")}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              />
              <div className="min-h-[20px] mt-1">
                {errors.name && <p className="text-[11px] text-red-500">{errors.name}</p>}
              </div>
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className={errors.category ? "text-red-500" : ""}>ประเภท</Label>
              <Select 
                value={form.category || ""} 
                onValueChange={(v) => {
                  setForm(f => ({ ...f, category: v }));
                  setErrors(prev => ({ ...prev, category: "" }));
                }}
              >
                <SelectTrigger className={errors.category ? "border-red-500 text-red-500 focus:ring-red-500" : ""}>
                  <SelectValue placeholder={errors.category ? errors.category : "ประเภท"} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="min-h-[20px] mt-1">
                {errors.category && <p className="text-[11px] text-red-500">{errors.category}</p>}
              </div>
            </div>

            <div>
              <Label className={errors.status ? "text-red-500" : ""}>สถานะ</Label>
              <Select 
                value={form.status || ""} 
                onValueChange={(v) => {
                  setForm(f => ({ ...f, status: v }));
                  setErrors(prev => ({ ...prev, status: "" }));
                }}
              >
                <SelectTrigger className={errors.status ? "border-red-500 text-red-500 focus:ring-red-500" : ""}>
                  <SelectValue placeholder={errors.status ? errors.status : "สถานะ"} />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="min-h-[20px] mt-1">
                {errors.status && <p className="text-[11px] text-red-500">{errors.status}</p>}
              </div>
            </div>
          </div>

          {/* Row 3 & 4 */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className={errors.assigned_to ? "text-red-500" : ""}>มอบหมาย</Label>
              <Input
                value={form.assigned_to || ""}
                placeholder={focusField === "assigned_to" ? "" : errors.assigned_to ? errors.assigned_to : "เช่น น.ส. ปัญญา ใจดี"}
                className={errors.assigned_to ? "border-red-500 placeholder:text-red-500" : ""}
                onFocus={() => {
                  setFocusField("assigned_to");
                  setErrors(prev => ({ ...prev, assigned_to: "" }));
                }}
                onBlur={() => setFocusField("")}
                onChange={(e) => setForm(f => ({ ...f, assigned_to: e.target.value }))}
              />
              <div className="min-h-[20px] mt-1">
                {errors.assigned_to && <p className="text-[11px] text-red-500">{errors.assigned_to}</p>}
              </div>
            </div>

            <div>
              <Label className={errors.department ? "text-red-500" : ""}>แผนก</Label>
              <Select 
                value={form.department || ""} 
                onValueChange={(v) => {
                  setForm(f => ({ ...f, department: v }));
                  setErrors(prev => ({ ...prev, department: "" }));
                }}
              >
                <SelectTrigger className={errors.department ? "border-red-500 text-red-500 focus:ring-red-500" : ""}>
                  <SelectValue placeholder={errors.department ? errors.department : "แผนก"} />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dep => <SelectItem key={dep} value={dep}>{dep}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="min-h-[20px] mt-1">
                {errors.department && <p className="text-[11px] text-red-500">{errors.department}</p>}
              </div>
            </div>

            <div>
              <Label>วันที่ซื้อ</Label>
              <Input 
                type="date" 
                value={form.purchase_date || ""} 
                onChange={(e) => {
                  setForm(f => ({ ...f, purchase_date: e.target.value }));
                  setErrors(prev => ({ ...prev, warranty_expire: "" })); 
                }} 
              />
              {/* บล็อกเปล่ารักษาความสูงสมดุลให้แถวที่ 4 */}
              <div className="min-h-[20px] mt-1" />
            </div>

            <div>
              <Label className={errors.warranty_expire ? "text-red-500" : ""}>วันหมดประกัน</Label>
              <Input 
                type="date" 
                value={form.warranty_expire || ""} 
                className={errors.warranty_expire ? "border-red-500 text-red-500 focus-visible:ring-red-500" : ""}
                onChange={(e) => {
                  setForm(f => ({ ...f, warranty_expire: e.target.value }));
                  setErrors(prev => ({ ...prev, warranty_expire: "" }));
                }} 
              />
              <div className="min-h-[20px] mt-1">
                {errors.warranty_expire && <p className="text-[11px] text-red-500">{errors.warranty_expire}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* ส่วนท้ายฟอร์ม */}
        <div className="flex justify-end items-center gap-3 mt-6 border-t pt-4">
          <Button
            className="hover:bg-[#111827] hover:text-white"
            variant="outline"
            onClick={handleCancel}
          >
            ยกเลิก
          </Button>
          <Button
            className="hover:bg-[#111827] hover:text-white"
            variant="outline"
            onClick={validateAndSave}
            disabled={saving}
          >
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </div>

        {/* หน้าต่างย่อยสำหรับแสดงตัวเลื่อนตัดรูป */}
        <ImageCropDialog
          isOpen={cropDialogOpen}
          setIsOpen={setCropDialogOpen}
          imageSrc={imageSrc}
          crop={crop}
          setCrop={setCrop}
          zoom={zoom}
          setZoom={setZoom}
          onCropComplete={(seededArea, pixels) => setCroppedAreaPixels(pixels)}
          onSave={saveCropLocal}
        />

      </DialogContent>
    </Dialog>
  );
}