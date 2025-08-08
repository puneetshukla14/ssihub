import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongodb";
import { Admin } from "@/models/Admin";
import bcrypt from "bcryptjs";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic"; // allow file upload in app router

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const data = XLSX.utils.sheet_to_json(sheet) as {
      name: string;
      email: string;
      password: string;
    }[];

    if (!data.length) {
      return NextResponse.json({ error: "Empty Excel file" }, { status: 400 });
    }

    await connectToDB();

    const adminsToInsert = await Promise.all(
      data.map(async (admin) => ({
        name: admin.name,
        email: admin.email,
        password: await bcrypt.hash(admin.password, 10),
      }))
    );

    await Admin.insertMany(adminsToInsert, { ordered: false });

    return NextResponse.json({ message: "Admins uploaded successfully" }, { status: 201 });
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Failed to upload admins", details: err.message },
      { status: 500 }
    );
  }
}
