import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import ImageCropDialog from './ImageCropDialog';
import ImageUploader from './ImageUploader';
import { Laptop, Lock, Wrench, RefreshCw, ArrowLeftRight, Unlock } from 'lucide-react';
import GodexPrintButton from '@/components/Device/GodexPrintButton'
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
    handleSave,
    categories,
    statuses,
    departments,
    onRepairSubmit,
    onTransferSubmit,
    onBorrowSubmit,
    onPrintBarcode
}) {
    const [imageSrc, setImageSrc] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [cropDialogOpen, setCropDialogOpen] = useState(false);

    // 🌟 States สำหรับควบคุมโมดอลย่อยด้านใน (Sub-dialogs)
    const [subModal, setSubModal] = useState({ type: null, isOpen: false });
    const [repairNote, setRepairNote] = useState("");
    const [transferForm, setTransferForm] = useState({
        from_user: form?.assigned_to || "",
        to_user: "",
        from_dept: form?.department || "",
        to_dept: ""
    });

    // 🔹 ฟังก์ชันจัดการเมื่อเลือกไฟล์รูปภาพ (Local)
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

    // 🔹 ฟังก์ชันตัดรูปผ่าน Canvas และอัปโหลดขึ้น Supabase Storage
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
                if (!blob) return;
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

    // 1. ตรวจสอบการบันทึก (ถ้าแก้รหัสอุปกรณ์ ให้เข้าสถานะรออนุมัติ)
    const validateAndSave = () => {
        const localErrors = {};
        if (!form?.name?.trim()) localErrors.name = "กรุณากรอกชื่ออุปกรณ์";
        if (!form?.asset_tag?.trim()) localErrors.asset_tag = "กรุณากรอกรหัสอุปกรณ์";

        if (Object.keys(localErrors).length > 0) {
            setErrors(localErrors);
            return;
        }

        handleSave({
            isPendingApproval: true,
        });
    };

    // 2. ฟังก์ชันจัดการเมื่อกดยืนยันการแจ้งซ่อม
    const handleConfirmRepair = async () => {
        if (!repairNote.trim()) {
            alert("กรุณาระบุอาการเสียก่อนส่งอนุมัติ");
            return;
        }

        try {
            // 1. อัปเดตข้อมูลในตารางอุปกรณ์ (devices)
            // เปลี่ยน status เป็น 'รออนุมัติซ่อม' และบันทึก repairNote ลงในตารางหรือตาราง log
            await supabase.from('devices').update({
                status: 'รออนุมัติซ่อม',
                repair_note: repairNote,
                last_updated: new Date().toISOString()
            }).eq('id', form.id);

            // 2. ส่งข้อมูลเข้าตารางการอนุมัติ (approvals) เพื่อให้หัวหน้ากด Approve ในหน้าถัดไป
            await supabase.from('approvals').insert({
                device_id: form.id,
                request_type: 'repair',
                note: repairNote,
                status: 'pending',
                created_at: new Date().toISOString()
            });

            // 3. ปิด Modal ทั้งหมดหลังจากบันทึกสำเร็จ
            setSubModal({ type: null, isOpen: false }); // ปิดตัวแจ้งซ่อม
            onClose(); // <--- เรียกฟังก์ชันปิดหน้า Edit หลัก (สำคัญมาก)

            alert("ส่งคำขอแจ้งซ่อมไปยังระบบอนุมัติเรียบร้อยแล้ว");
        } catch (error) {
            console.error("Error updating status:", error);
            alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        }
    };
    const handleCancel = () => {
        setErrors({});
        setIsOpen(false);
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

                {/* ส่วนหัว Dialog */}
                <DialogHeader className="border-b pb-3 shrink-0">
                    <DialogTitle className="flex items-center justify-between gap-2 text-base font-bold tracking-tight text-foreground">
                        <div className="flex items-center gap-2">
                            <div className="p-1 bg-amber-500/10 text-amber-500 rounded-lg border shadow-sm">
                                <Laptop size={15} />
                            </div>
                            <span>แก้ไขรายละเอียดอุปกรณ์</span>
                        </div>

                    </DialogTitle>
                </DialogHeader>



                {/* ส่วนปุ่มกดบันทึก */}
                <div className="flex justify-end items-center gap-2 border-t pt-3 shrink-0">
                    <Button className="hover:bg-[#111827] hover:text-white" variant="outline" onClick={handleCancel}>ยกเลิก</Button>
                    <Button className="hover:bg-[#111827] hover:text-white" variant="outline" onClick={validateAndSave} disabled={saving}>
                        {saving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                    </Button>
                </div>
            </DialogContent>
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
            />        </Dialog>
    );
}