export const locales = {
  en: {
    dir: 'ltr',
    name: 'English',
    flag: '🇺🇸',
    nav: {
      library: 'Music Library',
      nowPlaying: 'Now Playing',
      equalizer: 'Parametric EQ',
      hardware: 'DAC & Wireless',
      smartFlow: 'Smart Recommendations',
      settings: 'Settings'
    },
    header: {
      appName: 'Resonix Studio',
      tagline: 'High-Resolution Audio Engine & Smart Music Manager',
      bitPerfectActive: 'Bit-Perfect Direct',
      exclusiveActive: 'WASAPI Exclusive',
      hiResBadge: '24-bit / 192 kHz',
      changeLang: 'Language',
      bweToggle: 'AI Hi-Res Remaster (BWE)'
    },
    player: {
      format: 'Format',
      sampleRate: 'Sample Rate',
      bitDepth: 'Bit Depth',
      bufferFill: 'Ring Buffer',
      underflows: 'Underflows',
      prev: 'Previous',
      play: 'Play',
      pause: 'Pause',
      next: 'Next',
      shuffle: 'Shuffle',
      repeat: 'Repeat',
      volume: 'Volume',
      dopDsd: 'DSD over PCM'
    },
    library: {
      title: 'Music Library',
      subtitle: 'Bit-perfect lossless & Hi-Res catalog indexed in local SQLite',
      localTab: 'Local Masters',
      vaultTab: 'Public Vault (Open Hi-Res)',
      searchPlaceholder: 'Search public domain masters, Beethoven, Bach, Chopin...',
      addFiles: 'Import Audio Files',
      scanFolder: 'Scan Directory',
      trackCol: 'Title',
      artistCol: 'Artist',
      albumCol: 'Album',
      formatCol: 'Master Quality',
      drCol: 'Dynamic Range',
      actionsCol: 'Actions',
      playNow: 'Play Now',
      findSimilar: 'Smart Match',
      nativeMaster: 'Native Hi-Res',
      bweUpscaled: 'AI Remastered'
    },
    equalizer: {
      title: '10-Band Parametric Equalizer',
      subtitle: 'Audiophile bi-quad peaking filters with phase-linear compensation',
      enable: 'Enable Equalizer',
      bypass: 'Bypass EQ',
      reset: 'Reset to Flat',
      preset: 'Presets',
      presets: {
        flat: 'Studio Flat',
        warm: 'Audiophile Warmth (Tube Sound)',
        air: 'High-Res Treble Air',
        jazz: 'Acoustic & Jazz Presence',
        vocal: 'Vocal Intimacy',
        bass: 'Tight Sub-Bass Control'
      }
    },
    hardware: {
      title: 'Hardware DAC & Wireless Engine',
      subtitle: 'Exclusive output bypassing OS mixers and real-time Bluetooth codec passthrough',
      outputMode: 'Active Audio Output',
      outputDesc: 'Hardware direct stream with sample rate lock',
      exclusiveMode: 'Hardware Exclusive Mode',
      exclusiveNotice: 'Bypasses Windows mixer / Android AudioFlinger / CoreAudio resamplers',
      bluetoothTitle: 'Bluetooth A2DP Passthrough Status',
      bluetoothDevice: 'Connected Device',
      activeCodec: 'Active Codec',
      bitrate: 'Bitrate',
      latency: 'Buffer Latency',
      hiResWireless: 'Hi-Res Audio Wireless Certified',
      dynamicBadgeTitle: 'Dynamic Stream Badge',
      switchCodec: 'Simulate Codec Switch'
    },
    smartFlow: {
      title: 'Smart Music Manager & Similarity Flow',
      subtitle: 'Local 7-dimensional acoustic vector cosine similarity (100% offline & private)',
      currentSeed: 'Seed Track Profile',
      similarTracks: 'Nearest Acoustic Neighbors',
      similarityScore: 'Sonic Match',
      radarTitle: 'Acoustic Profile Radar',
      radarFeatures: {
        tempo: 'Tempo (BPM)',
        energy: 'Energy',
        timbre: 'Spectral Centroid',
        dance: 'Danceability',
        valence: 'Musical Valence',
        acoustic: 'Acousticness',
        dynamicRange: 'Dynamic Range (DR)'
      }
    },
    modal: {
      title: 'Select Preferred Language',
      desc: 'Resonix Studio supports universal typography and bidirectional LTR/RTL layouts.',
      confirm: 'Save & Continue'
    }
  },
  de: {
    dir: 'ltr',
    name: 'Deutsch',
    flag: '🇩🇪',
    nav: {
      library: 'Musikbibliothek',
      nowPlaying: 'Aktuelle Wiedergabe',
      equalizer: 'Parametrischer EQ',
      hardware: 'DAC & Drahtlos',
      smartFlow: 'Intelligente Empfehlungen',
      settings: 'Einstellungen'
    },
    header: {
      appName: 'Resonix Studio',
      tagline: 'High-Resolution Audio Engine & Smart Music Manager',
      bitPerfectActive: 'Bit-Perfekt Direkt',
      exclusiveActive: 'WASAPI Exklusiv',
      hiResBadge: '24-Bit / 192 kHz',
      changeLang: 'Sprache',
      bweToggle: 'KI Hi-Res Remaster (BWE)'
    },
    library: {
      title: 'Musikbibliothek',
      subtitle: 'Bit-perfekter verlustfreier & Hi-Res Katalog',
      localTab: 'Lokale Titel',
      vaultTab: 'Öffentlicher Tresor (Open Hi-Res)',
      searchPlaceholder: 'Meisterwerke, Beethoven, Bach durchsuchen...',
      addFiles: 'Audiodateien importieren',
      scanFolder: 'Ordner scannen',
      trackCol: 'Titel',
      artistCol: 'Künstler',
      albumCol: 'Album',
      formatCol: 'Master-Qualität',
      drCol: 'Dynamikbereich',
      actionsCol: 'Aktionen',
      playNow: 'Abspielen',
      findSimilar: 'Ähnliche finden',
      nativeMaster: 'Natives Hi-Res',
      bweUpscaled: 'KI Remastered'
    },
    equalizer: {
      title: '10-Band Parametrischer Equalizer',
      subtitle: 'Audiophile Bi-Quad-Filter',
      enable: 'Equalizer aktivieren',
      bypass: 'Bypass',
      reset: 'Auf Linear zurücksetzen',
      preset: 'Voreinstellungen',
      presets: {
        flat: 'Studio Linear',
        warm: 'Audiophile Wärme (Röhre)',
        air: 'Hi-Res Höhen-Luftigkeit',
        jazz: 'Akustik & Jazz',
        vocal: 'Stimmen-Intimität',
        bass: 'Subbass-Kontrolle'
      }
    },
    hardware: {
      title: 'Hardware-DAC & Drahtlos-Engine',
      subtitle: 'Exklusive Tonausgabe unter Umgehung des OS-Mixers',
      outputMode: 'Aktiver Audioausgang',
      outputDesc: 'Direkte Hardware-Verbindung',
      exclusiveMode: 'Hardware Exklusiv-Modus',
      exclusiveNotice: 'Umgeht Windows AudioDG / Android AudioFlinger',
      bluetoothTitle: 'Bluetooth A2DP Passthrough-Status',
      bluetoothDevice: 'Verbundenes Gerät',
      activeCodec: 'Aktiver Codec',
      bitrate: 'Bitrate',
      latency: 'Pufferlatenz',
      hiResWireless: 'Hi-Res Audio Wireless Zertifiziert',
      dynamicBadgeTitle: 'Dynamisches Stream-Abzeichen',
      switchCodec: 'Codec-Umschaltung simulieren'
    },
    smartFlow: {
      title: 'Intelligenter Musikmanager',
      subtitle: 'Lokale akustische Vektor-Kosinus-Ähnlichkeit (100% offline)',
      currentSeed: 'Referenztitel-Profil',
      similarTracks: 'Nächste akustische Nachbarn',
      similarityScore: 'Klangliche Übereinstimmung',
      radarTitle: 'Akustikprofil-Radar',
      radarFeatures: {
        tempo: 'Tempo (BPM)',
        energy: 'Energie',
        timbre: 'Spektraler Schwerpunkt',
        dance: 'Tanzbarkeit',
        valence: 'Valenz',
        acoustic: 'Akustik',
        dynamicRange: 'Dynamikumfang (DR)'
      }
    },
    modal: {
      title: 'Bevorzugte Sprache auswählen',
      desc: 'Resonix Studio unterstützt universelle Typografie und LTR/RTL-Layouts.',
      confirm: 'Speichern & Fortfahren'
    }
  },
  ja: {
    dir: 'ltr',
    name: '日本語',
    flag: '🇯🇵',
    nav: {
      library: 'ミュージックライブラリ',
      nowPlaying: '再生中',
      equalizer: 'パラメトリックEQ',
      hardware: 'DAC＆ワイヤレス',
      smartFlow: 'スマート推薦',
      settings: '設定'
    },
    header: {
      appName: 'Resonix Studio',
      tagline: 'ハイレゾ音源再生エンジン＆スマート音楽マネージャー',
      bitPerfectActive: 'ビットパーフェクト直接出力',
      exclusiveActive: 'WASAPI排他モード',
      hiResBadge: '24-bit / 192 kHz',
      changeLang: '言語切替',
      bweToggle: 'AIハイレゾ高域復元 (BWE)'
    },
    library: {
      title: 'ミュージックライブラリ',
      subtitle: '完全ビットパーフェクト＆ハイレゾ音源のローカルインデックス',
      localTab: 'ローカル音源',
      vaultTab: '公開ハイレゾ保管庫 (Open Hi-Res)',
      searchPlaceholder: 'パブリックドメイン名盤、ベートーヴェン、バッハを検索...',
      addFiles: '音声ファイルを追加',
      scanFolder: 'フォルダをスキャン',
      trackCol: '曲名',
      artistCol: 'アーティスト',
      albumCol: 'アルバム',
      formatCol: 'マスター音質',
      drCol: 'ダイナミックレンジ',
      actionsCol: '操作',
      playNow: '今すぐ再生',
      findSimilar: '類似曲検索',
      nativeMaster: 'ネイティブハイレゾ',
      bweUpscaled: 'AI復元アップスケーリング'
    },
    equalizer: {
      title: '10バンド・パラメトリックイコライザー',
      subtitle: 'オーディオファイル向け位相線形バイカッドフィルター',
      enable: 'EQを有効化',
      bypass: 'バイパス',
      reset: 'フラットに戻す',
      preset: 'プリセット',
      presets: {
        flat: 'スタジオフラット',
        warm: '真空管ウォーム',
        air: '高域エア感',
        jazz: 'ジャズ＆アコースティック',
        vocal: 'ボーカル強調',
        bass: 'タイト・サブベース'
      }
    },
    hardware: {
      title: 'ハードウェアDAC＆ワイヤレスエンジン',
      subtitle: 'OSミキサー完全バイパス排他出力',
      outputMode: 'アクティブオーディオ出力',
      outputDesc: '周波数ロック対応ハードウェア接続',
      exclusiveMode: 'ハードウェア排他モード',
      exclusiveNotice: 'Windowsミキサー / Android AudioFlingerを回避',
      bluetoothTitle: 'Bluetooth A2DPパススルー状態',
      bluetoothDevice: '接続機器',
      activeCodec: '使用中コーデック',
      bitrate: 'ビットレート',
      latency: 'バッファレイテンシ',
      hiResWireless: 'Hi-Res Audio Wireless認証',
      dynamicBadgeTitle: '動的ストリームバッジ',
      switchCodec: 'コーデック切り替えテスト'
    },
    smartFlow: {
      title: 'スマート音楽マネージャー',
      subtitle: '完全ローカル7次元音響特徴ベクトル・コサイン類似度',
      currentSeed: 'シード曲プロファイル',
      similarTracks: '最も音響特徴が近い曲',
      similarityScore: '音響マッチ度',
      radarTitle: '音響特徴レーダーチャート',
      radarFeatures: {
        tempo: 'テンポ (BPM)',
        energy: 'エネルギー',
        timbre: 'スペクトル重心',
        dance: 'ダンス適性',
        valence: '感情価',
        acoustic: 'アコースティック感',
        dynamicRange: 'ダイナミックレンジ (DR)'
      }
    },
    modal: {
      title: '使用言語を選択してください',
      desc: 'Resonix StudioはユニバーサルタイポグラフィとLTR/RTL両方向レイアウトに対応しています。',
      confirm: '保存して開始'
    }
  },
  ar: {
    dir: 'rtl',
    name: 'العربية',
    flag: '🇸🇦',
    nav: {
      library: 'مكتبة الموسيقى',
      nowPlaying: 'قيد التشغيل',
      equalizer: 'معادل الصوت 10-Band',
      hardware: 'محول DAC واللاسلكي',
      smartFlow: 'التوصيات الذكية',
      settings: 'الإعدادات'
    },
    header: {
      appName: 'ريزونيكس ستوديو',
      tagline: 'محرك صوتي عالي الدقة ومدير موسيقى ذكي',
      bitPerfectActive: 'نقل نقي Bit-Perfect مباشر',
      exclusiveActive: 'وضع WASAPI الحصري',
      hiResBadge: '24-بت / 192 كيلوهرتز',
      changeLang: 'اللغة',
      bweToggle: 'إعادة ماستر الذكاء الصوتي (BWE)'
    },
    library: {
      title: 'مكتبة الموسيقى',
      subtitle: 'كتالوج غير مضغوط عالي الدقة مفهرس محلياً',
      localTab: 'الملفات المحلية',
      vaultTab: 'الخزانة العامة (Open Hi-Res)',
      searchPlaceholder: 'ابحث في الروائع الكلاسيكية، باخ، بيتهوفن...',
      addFiles: 'استيراد ملفات صوتية',
      scanFolder: 'فحص مجلد',
      trackCol: 'العنوان',
      artistCol: 'الفنان',
      albumCol: 'الألبوم',
      formatCol: 'جودة الماستر',
      drCol: 'النطاق الديناميكي',
      actionsCol: 'إجراءات',
      playNow: 'تشغيل الآن',
      findSimilar: 'تطابق ذكي',
      nativeMaster: 'ماستر أصلي',
      bweUpscaled: 'ترقية صوتية BWE'
    },
    equalizer: {
      title: 'معادل صوت بارامتري 10 نطاقات',
      subtitle: 'فلاتر Bi-quad صوتية دقيقة',
      enable: 'تفعيل المعادل',
      bypass: 'تخطي المعادل',
      reset: 'إعادة ضبط مسطح',
      preset: 'الإعدادات المسبقة',
      presets: {
        flat: 'استوديو مسطح',
        warm: 'دفء أنبوبي',
        air: 'هواء الترددات العالية',
        jazz: 'حضور الجاز',
        vocal: 'وضوح الأصوات',
        bass: 'تحكم في الباس'
      }
    },
    hardware: {
      title: 'عتاد DAC ومحرك البث اللاسلكي',
      subtitle: 'إخراج حصري يتجاوز مازجات النظام',
      outputMode: 'مخرج الصوت النشط',
      outputDesc: 'اتصال عتادي مباشر',
      exclusiveMode: 'الوضع العتادي الحصري',
      exclusiveNotice: 'يتجاوز معالجات Windows AudioDG و Android AudioFlinger',
      bluetoothTitle: 'حالة مسار البلوتوث A2DP',
      bluetoothDevice: 'الجهاز المتصل',
      activeCodec: 'الكوديك النشط',
      bitrate: 'معدل البت',
      latency: 'زمن استجابة التخزين',
      hiResWireless: 'معتمد للصوت اللاسلكي عالي الدقة',
      dynamicBadgeTitle: 'شارة البث الديناميكية',
      switchCodec: 'محاكاة تبديل الكوديك'
    },
    smartFlow: {
      title: 'المدير الذكي وتدفق التشابه الصوتي',
      subtitle: 'تشابه جيب التمام الموجه بسبعة أبعاد محلياً (100% غير متصل)',
      currentSeed: 'ملف المقطع الأساسي',
      similarTracks: 'أقرب المقاطع المشابهة نغمياً',
      similarityScore: 'نسبة التطابق الصوتي',
      radarTitle: 'مخطط الرادار الصوتي',
      radarFeatures: {
        tempo: 'الإيقاع (BPM)',
        energy: 'الطاقة',
        timbre: 'المركز الطيفي',
        dance: 'قابلية الرقص',
        valence: 'الإيجابية النغمية',
        acoustic: 'الطبيعة الصوتية',
        dynamicRange: 'النطاق الديناميكي (DR)'
      }
    },
    modal: {
      title: 'اختر لغتك المفضلة',
      desc: 'يدعم ريزونيكس ستوديو الخطوط العالمية والتخطيط من اليمين لليسار (RTL) بسلاسة.',
      confirm: 'حفظ ومتابعة'
    }
  },
  fr: {
    dir: 'ltr',
    name: 'Français',
    flag: '🇫🇷',
    nav: {
      library: 'Bibliothèque',
      nowPlaying: 'Lecture en cours',
      equalizer: 'Égaliseur Paramétrique',
      hardware: 'DAC & Sans fil',
      smartFlow: 'Recommandations',
      settings: 'Paramètres'
    },
    header: {
      appName: 'Resonix Studio',
      tagline: 'Moteur Audio Haute Résolution & Gestionnaire Intelligent',
      bitPerfectActive: 'Bit-Perfect Direct',
      exclusiveActive: 'WASAPI Exclusif',
      hiResBadge: '24-bit / 192 kHz',
      changeLang: 'Langue',
      bweToggle: 'Restoration Hi-Res IA (BWE)'
    },
    library: {
      title: 'Bibliothèque Musicale',
      subtitle: 'Catalogue haute résolution indexé localement',
      localTab: 'Masters Locaux',
      vaultTab: 'Coffre Public (Open Hi-Res)',
      searchPlaceholder: 'Rechercher des chefs-d’œuvre, Beethoven, Bach...',
      addFiles: 'Importer des fichiers',
      scanFolder: 'Scanner un dossier',
      trackCol: 'Titre',
      artistCol: 'Artiste',
      albumCol: 'Album',
      formatCol: 'Qualité Master',
      drCol: 'Plage Dynamique',
      actionsCol: 'Actions',
      playNow: 'Lire',
      findSimilar: 'Similaires',
      nativeMaster: 'Hi-Res Natif',
      bweUpscaled: 'Remasterisé IA'
    },
    equalizer: {
      title: 'Égaliseur Paramétrique 10 Bandes',
      subtitle: 'Filtres bi-quad audiophiles',
      enable: 'Activer l’EQ',
      bypass: 'Contourner',
      reset: 'Réinitialiser',
      preset: 'Préréglages',
      presets: {
        flat: 'Studio Neutre',
        warm: 'Chaleur Tube',
        air: 'Clarté Aiguë',
        jazz: 'Acoustique & Jazz',
        vocal: 'Intimité Vocale',
        bass: 'Contrôle des Basses'
      }
    },
    hardware: {
      title: 'Moteur DAC Matériel & Sans-Fil',
      subtitle: 'Sortie exclusive contournant le mixeur OS',
      outputMode: 'Sortie Audio Active',
      outputDesc: 'Flux matériel direct sans rééchantillonnage',
      exclusiveMode: 'Mode Matériel Exclusif',
      exclusiveNotice: 'Contourne les mélangeurs Windows et Android',
      bluetoothTitle: 'État Passthrough Bluetooth A2DP',
      bluetoothDevice: 'Appareil Connecté',
      activeCodec: 'Codec Actif',
      bitrate: 'Débit',
      latency: 'Latence Tampon',
      hiResWireless: 'Certifié Hi-Res Audio Sans Fil',
      dynamicBadgeTitle: 'Badge de Flux Dynamique',
      switchCodec: 'Simuler Changement de Codec'
    },
    smartFlow: {
      title: 'Gestionnaire Intelligent',
      subtitle: 'Similarité cosinus acoustique 7D locale (100% hors ligne)',
      currentSeed: 'Profil du Morceau Référence',
      similarTracks: 'Voisins Acoustiques Proches',
      similarityScore: 'Score de Correspondance',
      radarTitle: 'Radar de Profil Acoustique',
      radarFeatures: {
        tempo: 'Tempo (BPM)',
        energy: 'Énergie',
        timbre: 'Centroïde Spectral',
        dance: 'Dansabilité',
        valence: 'Valence',
        acoustic: 'Acoustique',
        dynamicRange: 'Plage Dynamique (DR)'
      }
    },
    modal: {
      title: 'Choisissez votre langue',
      desc: 'Resonix Studio prend en charge la typographie universelle et les dispositions LTR/RTL.',
      confirm: 'Enregistrer et Continuer'
    }
  },
  zh: {
    dir: 'ltr',
    name: '简体中文',
    flag: '🇨🇳',
    nav: {
      library: '音乐曲库',
      nowPlaying: '正在播放',
      equalizer: '参量均衡器',
      hardware: '解码与无线',
      smartFlow: '智能推荐',
      settings: '系统设置'
    },
    header: {
      appName: 'Resonix Studio',
      tagline: '高解析度母带音频引擎与智能声学管理中心',
      bitPerfectActive: 'Bit-Perfect 硬件直通',
      exclusiveActive: 'WASAPI 独占模式',
      hiResBadge: '24-bit / 192 kHz',
      changeLang: '切换语言',
      bweToggle: 'AI母带重构与超频 (BWE)'
    },
    library: {
      title: '音乐曲库',
      subtitle: '基于本地嵌入式 SQLite 的纯净无损与母带音轨库',
      localTab: '本地母带',
      vaultTab: '公共母带金库 (Open Hi-Res)',
      searchPlaceholder: '搜索公有领域无损母带、贝多芬、巴赫、肖邦...',
      addFiles: '导入音频文件',
      scanFolder: '扫描本地目录',
      trackCol: '曲目名称',
      artistCol: '艺术家',
      albumCol: '专辑',
      formatCol: '母带级别',
      drCol: '动态范围 (DR)',
      actionsCol: '操作',
      playNow: '立即播放',
      findSimilar: '声学相似推荐',
      nativeMaster: '原生高解析',
      bweUpscaled: 'AI母带重构'
    },
    equalizer: {
      title: '10段专业参量均衡器',
      subtitle: '发烧级双二阶滤波算法与线性相位补偿',
      enable: '启用均衡器',
      bypass: '旁通',
      reset: '重置为平直',
      preset: '音色预设',
      presets: {
        flat: '参考平直',
        warm: '温润电子管',
        air: '超高频泛音',
        jazz: '原声与爵士',
        vocal: '人声贴耳',
        bass: '超重低音'
      }
    },
    hardware: {
      title: '硬件解码器 (DAC) 与无线高清引擎',
      subtitle: '硬件独占直通与蓝牙母带流无损传输',
      outputMode: '当前输出设备',
      outputDesc: '锁定硬件原生采样率',
      exclusiveMode: '硬件独占直通',
      exclusiveNotice: '避开 Windows 混音器与安卓 AudioFlinger',
      bluetoothTitle: '蓝牙 A2DP 高清传输状态',
      bluetoothDevice: '已连接接收设备',
      activeCodec: '当前编码协议',
      bitrate: '传输码率',
      latency: '缓冲区延迟',
      hiResWireless: 'Hi-Res Audio Wireless 认证',
      dynamicBadgeTitle: '动态流状态徽标',
      switchCodec: '切换编码协议测试'
    },
    smartFlow: {
      title: '智能音乐分析与声学相似流',
      subtitle: '本地 7 维声学特征向量余弦相似度推荐',
      currentSeed: '当前母带声学指纹',
      similarTracks: '最近声学特征邻近曲目',
      similarityScore: '声学相似指数',
      radarTitle: '声学特征雷达图谱',
      radarFeatures: {
        tempo: '节拍速度 (BPM)',
        energy: '能量密度',
        timbre: '频谱质心',
        dance: '律动性',
        valence: '情绪愉悦度',
        acoustic: '原声器乐度',
        dynamicRange: '动态范围 (DR)'
      }
    },
    modal: {
      title: '选择首选语言',
      desc: 'Resonix Studio 全面支持多国语言字体渲染与双向 LTR/RTL 交互界面。',
      confirm: '保存并进入'
    }
  }
};
