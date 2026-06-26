import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { Laptop, AlertCircle, Unlock, Lock } from 'lucide-react';
import ImageCropDialog from './ImageCropDialog';
import ImageUploader from './ImageUploader';
import GodexPrintButton from '@/components/Device/GodexPrintButton';

export default function DeviceEditDialog({
  isOpen,
  setIsOpen,
  form,
  setForm,
  errors,
  setErrors,
  focusField,
  setFocusField,
  saving,
  setSaving, // รับ setSaving มาเพื่อคุมสถานะปุ่มกด
  categories,
  statuses,
  departments,
  onPrintBarcode
}) {
  // States สำหรับจัดการ Crop รูปภาพเหมือนหน้าหลัก
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);

  const handleCancel = () => {
    setErrors({});
    setIsOpen(false);
  };

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

  const saveCropLocal = async () => {
    if (!croppedAreaPixels || !imageSrc) return;
    // ... โครงสร้างการแปลง Canvas และอัปโหลดไฟล์ขึ้น Supabase Storage (คงตาม Logic เดิมของคุณ)
    setCropDialogOpen(false);
  };

  // 🌟 ฟังก์ชัน Validate และส่งคำขอไปที่ระบบอนุมัติ (Approvals)
  const validateAndSendRequest = async () => {
    const localErrors = {};
    if (!form?.asset_tag?.trim()) localErrors.asset_tag = "กรุณากรอกรหัสอุปกรณ์";
    if (!form?.name?.trim()) localErrors.name = "กรุณากรอกชื่ออุปกรณ์";
    if (!form?.department) localErrors.department = "กรุณาเลือกฝ่าย / แผนก";
    if (!form?.category) localErrors.category = "กรุณาเลือกประเภทอุปกรณ์";

    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }

    setSaving(true);
    try {
      // 1. ส่งข้อมูลชุดใหม่ไปบันทึกรอไว้ที่ตาราง approvals (เก็บ object ครบเซ็ตไว้ในช่อง note หรือ payload)
      const { error: approvalError } = await supabase.from('approvals').insert({
        device_id: form.id,
        request_type: 'edit',
        status: 'pending',
        note: `ขอแก้ไขข้อมูลอุปกรณ์: ${form.name}`,
        // สามารถแนบข้อมูลฟอร์มใหม่เข้าไปเพื่อให้หน้า Approve ดึงไปอัปเดตต่อได้
        payload: form, 
        created_at: new Date().toISOString()
      });

      if (approvalError) throw approvalError;

      // 2. ปรับสถานะของอุปกรณ์ตัวนี้ชั่วคราวเป็น 'รออนุมัติแก้ไข' เพื่อล็อกไม่ให้ถูกแก้ไขซ้ำซ้อน
      await supabase.from('devices').update({
        status: 'รออนุมัติแก้ไข'
      }).eq('id', form.id);

      alert("ส่งคำขอแก้ไขไปยังระบบอนุมัติเรียบร้อยแล้ว");
      setIsOpen(false);
    } catch (error) {
      console.error("Error sending edit request:", error);
      alert("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto sm:rounded-2xl"
        style={{
          backgroundColor: '#ffffff',
          opacity: 1,
          backdropFilter: 'none',
          boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)'
        }}
      >
        {/* ส่วนหัว */}
        <DialogHeader className="border-b pb-3 shrink-0">
          <DialogTitle className="flex items-center justify-between gap-2 text-base font-bold tracking-tight text-foreground">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-amber-500/10 text-amber-500 rounded-lg border shadow-sm">
                <Laptop size={15} />
              </div>
              <span>แก้ไขรายละเอียดอุปกรณ์ (ส่งคำขออนุมัติ)</span>
            </div>
            <GodexPrintButton form={form} onPrintBarcode={onPrintBarcode} />
          </DialogTitle>
        </DialogHeader>

        {/* ส่วนเนื้อหาฟอร์ม */}
        <div className="flex-1 my-3 space-y-4 overflow-hidden w-full">

          {/* ส่วนอัปโหลดรูปภาพ */}
          <div className="flex flex-col items-center justify-center bg-muted/5 py-3 px-4 rounded-xl border border-dashed w-full max-h-[130px]">
            <div className="scale-90 transform origin-center">
              <ImageUploader
                imageUrl={form?.image_url}
                onImageChange={handleImageChangeLocal}
              />
            </div>
          </div>

          {/* แผงกรอกข้อมูลหลัก */}
          <div className="bg-background rounded-xl border p-4 shadow-sm w-full">
            <div className="grid grid-cols-2 gap-x-5 gap-y-1">

              {/* แถวที่ 1: รหัสอุปกรณ์ | ชื่ออุปกรณ์ */}
              <div className="w-full">
                <Label className={`text-[11px] font-bold flex items-center gap-1 ${errors.asset_tag ? "text-red-500" : "text-foreground/80"}`}>
               รหัสอุปกรณ์
                </Label>
                <Input
                  value={form?.asset_tag || ""}
                  placeholder={focusField === "asset_tag" ? "" : errors.asset_tag ? errors.asset_tag : "เช่น ASSET-001"}
                  className={`mt-1 h-8 text-xs rounded-md font-mono transition-colors ${errors.asset_tag ? "border-red-500 bg-red-50/20 placeholder:text-red-400 focus-visible:ring-red-500" : ""}`}
                  onFocus={() => { setFocusField("asset_tag"); setErrors(prev => ({ ...prev, asset_tag: "" })); }}
                  onBlur={() => setFocusField("")}
                  onChange={(e) => setForm(f => ({ ...f, asset_tag: e.target.value }))}
                />
                <div className="mt-0.5 min-h-[16px] flex items-center gap-1 text-red-500">
                  {errors.asset_tag && (
                    <>
                      <AlertCircle size={10} className="shrink-0" />
                      <p className="text-[10px] font-semibold leading-none">{errors.asset_tag}</p>
                    </>
                  )}
                </div>
              </div>

              <div className="w-full">
                <Label className={`text-[11px] font-bold ${errors.name ? "text-red-500" : "text-foreground/80"}`}>ชื่ออุปกรณ์</Label>
                <Input
                  value={form?.name || ""}
                  placeholder={focusField === "name" ? "" : errors.name ? errors.name : "เช่น Laptop Dell XPS 13"}
                  className={`mt-1 h-8 text-xs rounded-md transition-colors ${errors.name ? "border-red-500 bg-red-50/20 placeholder:text-red-400 focus-visible:ring-red-500" : ""}`}
                  onFocus={() => { setFocusField("name"); setErrors(prev => ({ ...prev, name: "" })); }}
                  onBlur={() => setFocusField("")}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                />
                <div className="mt-0.5 min-h-[16px] flex items-center gap-1 text-red-500">
                  {errors.name && (
                    <>
                      <AlertCircle size={10} className="shrink-0" />
                      <p className="text-[10px] font-semibold leading-none">{errors.name}</p>
                    </>
                  )}
                </div>
              </div>

              {/* ล็อกสิทธิ์ผู้ครอบครองดั้งเดิม (แก้ไขผ่าน workflow ย้าย/ยืม เท่านั้น) */}
              <div className="w-full">
                <Label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                  <Lock size={10} /> ผู้ได้รับมอบหมาย (อ่านอย่างเดียว)
                </Label>
                <Input
                  disabled
                  value={form?.assigned_to || "ไม่มีผู้ครองสิทธิ์"}
                  className="mt-1 h-8 text-xs rounded-md bg-muted/50 cursor-not-allowed"
                />
                <div className="min-h-[16px]" />
              </div>

              {/* แผนก */}
              <div className="w-full">
                <Label className={`text-[11px] font-bold ${errors.department ? "text-red-500" : "text-foreground/80"}`}>ฝ่าย / แผนก</Label>
                <div className="mt-1">
                  <Select value={form?.department || ""} onValueChange={(v) => { setForm(f => ({ ...f, department: v })); setErrors(prev => ({ ...prev, department: "" })); }}>
                    <SelectTrigger className={`h-8 text-xs rounded-md transition-colors ${errors.department ? "border-red-500 bg-red-50/20 text-red-500 focus:ring-red-500" : ""}`}>
                      <SelectValue placeholder={errors.department ? errors.department : "เลือกแผนก"} />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      {departments.map(dep => <SelectItem key={dep} value={dep} className="text-xs">{dep}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="mt-0.5 min-h-[16px] flex items-center gap-1 text-red-500">
                  {errors.department && (
                    <>
                      <AlertCircle size={10} className="shrink-0" />
                      <p className="text-[10px] font-semibold leading-none">{errors.department}</p>
                    </>
                  )}
                </div>
              </div>

              {/* ประเภทอุปกรณ์ */}
              <div className="w-full">
                <Label className={`text-[11px] font-bold ${errors.category ? "text-red-500" : "text-foreground/80"}`}>ประเภทอุปกรณ์</Label>
                <div className="mt-1">
                  <Select value={form?.category || ""} onValueChange={(v) => { setForm(f => ({ ...f, category: v })); setErrors(prev => ({ ...prev, category: "" })); }}>
                    <SelectTrigger className={`h-8 text-xs rounded-md transition-colors ${errors.category ? "border-red-500 bg-red-50/20 text-red-500 focus:ring-red-500" : ""}`}>
                      <SelectValue placeholder={errors.category ? errors.category : "เลือกประเภท"} />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      {categories.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="mt-0.5 min-h-[16px] flex items-center gap-1 text-red-500">
                  {errors.category && (
                    <>
                      <AlertCircle size={10} className="shrink-0" />
                      <p className="text-[10px] font-semibold leading-none">{errors.category}</p>
                    </>
                  )}
                </div>
              </div>

              {/* ล็อกสถานะเดิมไว้ (แก้ไขโดยตรงไม่ได้) */}
              <div className="w-full">
                <Label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                  <Lock size={10} /> สถานะปัจจุบัน (อ่านอย่างเดียว)
                </Label>
                <div className="mt-1">
                  <Select value={form?.status || ""} disabled>
                    <SelectTrigger className="h-8 text-xs rounded-md bg-muted/50 cursor-not-allowed text-muted-foreground">
                      <SelectValue placeholder="เลือกสถานะ" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      {statuses.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-h-[16px]" />
              </div>

              {/* แถวระบุวันที่ซื้อ | วันหมดประกัน */}
              <div className="w-full border-t border-dashed pt-2 mt-1">
                <Label className="text-[11px] font-bold text-foreground/80 flex items-center gap-1">วันที่ซื้ออุปกรณ์</Label>
                <Input
                  type="date"
                  value={form?.purchase_date || ""}
                  className="mt-1 h-8 text-xs rounded-md focus-visible:ring-primary font-mono"
                  onChange={(e) => setForm(f => ({ ...f, purchase_date: e.target.value }))}
                />
                <div className="min-h-[16px]" />
              </div>

              <div className="w-full border-t border-dashed pt-2 mt-1">
                <Label className={`text-[11px] font-bold flex items-center gap-1 ${errors.warranty_expire ? "text-red-500" : "text-foreground/80"}`}>วันหมดประกัน</Label>
                <Input
                  type="date"
                  value={form?.warranty_expire || ""}
                  className={`mt-1 h-8 text-xs rounded-md font-mono transition-colors ${errors.warranty_expire ? "border-red-500 bg-red-50/20 text-red-500 focus-visible:ring-red-500" : "focus-visible:ring-primary"}`}
                  onChange={(e) => { setForm(f => ({ ...f, warranty_expire: e.target.value })); setErrors(prev => ({ ...prev, warranty_expire: "" })); }}
                />
                <div className="mt-0.5 min-h-[16px] flex items-center gap-1 text-red-500">
                  {errors.warranty_expire && (
                    <>
                      <AlertCircle size={10} className="shrink-0" />
                      <p className="text-[10px] font-semibold leading-none">{errors.warranty_expire}</p>
                    </>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ส่วนปุ่มกด Actions ท้ายฟอร์ม */}
        <div className="flex justify-end items-center gap-2 border-t pt-3 shrink-0">
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
            onClick={validateAndSendRequest}
            disabled={saving}
          >
            {saving ? (
              <div className="flex items-center gap-1.5">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current" />
                <span>กำลังส่งคำขอ...</span>
              </div>
            ) : "ส่งคำขอแก้ไขอนุมัติ"}
          </Button>
        </div>

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