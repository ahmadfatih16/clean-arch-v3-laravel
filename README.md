# Laravel Code Smell Analyzer
> Detect code smells. Analyze structure. Improve Laravel code quality — directly in your editor.

## ✨ Overview

Laravel Code Smell Analyzer is a Visual Studio Code extension designed to help developers identify and improve code quality in Laravel projects.

Using rule-based static analysis powered by Abstract Syntax Tree (AST), this extension detects common architectural issues and code smells such as Fat Controllers, High Complexity, and Direct Database Access.

It also provides guided refactoring suggestions to help maintain clean, modular, and maintainable code.

---

VS Code Extension untuk mendeteksi pelanggaran struktur kode berbasis *Clean Architecture* pada proyek Laravel, serta menyediakan mekanisme *auto-refactoring* untuk meningkatkan kualitas kode secara langsung di dalam editor.

---

## 🚀 Features

### 🔍 Code Smell Detection

Extension ini mampu mendeteksi tiga jenis code smell utama:

- **Fat Controller**
- **High Complexity**
- **Direct Database Access**

Deteksi dilakukan menggunakan pendekatan **rule-based static analysis** berbasis **Abstract Syntax Tree (AST)**.

---

### ⚙️ Auto Refactoring

- **Direct Database Access** → otomatis dipindahkan ke Service Layer  
- **Fat Controller** → hanya *warning* & *suggestion*  
- **High Complexity** → hanya *warning* & *suggestion*  

---

## 📊 Supported Rules

Extension ini menggunakan pendekatan rule-based static analysis berbasis Abstract Syntax Tree (AST) untuk mendeteksi pelanggaran struktur kode berdasarkan prinsip Clean Architecture.

### 1. Fat Controller

Controller dikategorikan sebagai *Fat Controller* jika memenuhi indikator berikut:

| Metrik             | Threshold |
|--------------------|-----------|
| Method Count       | > 7       |
| Class LOC          | > 150     |
| Method LOC         | > 30      |
| Dependency Count   | > 4       |

📌 Tujuan:
Mendeteksi penumpukan tanggung jawab pada controller yang melanggar prinsip Single Responsibility Principle (SRP).

---

### 2. High Complexity

Kompleksitas logika diukur menggunakan **Cyclomatic Complexity (CC)**.

| Kondisi       | Kategori |
|---------------|----------|
| CC > 5        | Warning  |
| CC > 10       | Error    |

📌 Tujuan:
Mengidentifikasi method dengan kompleksitas tinggi yang sulit dipahami, diuji, dan dipelihara.

---

### 3. Direct Database Access

Code smell ini terjadi ketika controller mengakses database secara langsung tanpa melalui layer yang sesuai.

#### Pola yang dideteksi:
`php
User::create($data);
User::where(...)->update(...);

DB::table('users')->get();

---------------------------------------------------------------

## 🧪 How to Use

### 1. Install Extension
- Buka Visual Studio Code  
- Masuk ke menu Extensions  
- Cari: **Laravel Code Smell Detector**  
- Klik **Install**  
- Tunggu hingga proses instalasi selesai  

---

### 2. Buka Project Laravel
- Buka folder proyek Laravel di Visual Studio Code  
- Pastikan struktur proyek sesuai standar Laravel  
- Analisis difokuskan pada file controller  

Contoh lokasi file yang dianalisis:
app/Http/Controllers/UserController.php

--- 

### 3. Analisis Otomatis
Extension akan berjalan secara otomatis ketika:
- File PHP dibuka
- File diubah (real-time analysis)
Tidak diperlukan menjalankan perintah manual.

---

### 4. Lihat Hasil Deteksi
Hasil analisis akan muncul sebagai:
- 🔶 Warning → pelanggaran struktur kode
- 🔴 Error → pelanggaran dengan tingkat kompleksitas tinggi
Setiap diagnostic juga dilengkapi dengan rekomendasi perbaikan (suggestion).

Ditampilkan di:
- Editor (underline / highlight)
- Panel Problems di VS Code

---

### 5. Gunakan Auto Refactor
Untuk kasus Direct Database Access:
- Arahkan cursor ke kode yang terdeteksi
- Tekan Ctrl + .
- Pilih Quick Fix

Extension akan:
- Memindahkan logika database ke service layer
- Memperbaiki pemanggilan di controller


---------------------------------------------------------------------


## ⚙️ Requirements
- Visual Studio Code
- Proyek berbasis Laravel (PHP)


## 👨‍💻 Author
Ahmad Fatih Hibatillah
Informatika - UIN Sunan Kalijaga Yogyakarta