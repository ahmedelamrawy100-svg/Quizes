/* ═══════════════════════════════════════════════════════════════════
   🎴 CARDS DATABASE — قاعدة بيانات البطاقات المشتركة (مصدر واحد للحقيقة)
   تستخدمها: features/card-battle.js + features/live-auctions.js

   ═══ التيرات (11 تير) — كل ما التير يعلية:
       • القوة الأساسية أعلى
       • فلوس الترقية أغلى (costMult)
   ═══════════════════════════════════════════════════════════════════ */

export const RARITY = {
    common:       { label_ar: 'عادي',       label_en: 'Common',       color: '#9e9e9e', power: 50,   costMult: 1   },
    rare:         { label_ar: 'نادر',       label_en: 'Rare',         color: '#2196f3', power: 80,   costMult: 1.5 },
    epic:         { label_ar: 'ملحمي',      label_en: 'Epic',         color: '#a855f7', power: 120,  costMult: 2   },
    legendary:    { label_ar: 'أسطوري',     label_en: 'Legendary',    color: '#ffd700', power: 180,  costMult: 3   },
    mythic:       { label_ar: 'خرافي',      label_en: 'Mythic',       color: '#ff2d95', power: 260,  costMult: 4   },
    exotic:       { label_ar: 'إكسوتيك',    label_en: 'Exotic',       color: '#00e5ff', power: 380,  costMult: 5   },
    immortal:     { label_ar: 'خالد',       label_en: 'Immortal',     color: '#76ff03', power: 550,  costMult: 6   },
    divine:       { label_ar: 'إلهي',       label_en: 'Divine',       color: '#ffffff', power: 780,  costMult: 7   },
    secret:       { label_ar: 'سري',        label_en: 'Secret',       color: '#212121', power: 1100, costMult: 8   },
    godly:        { label_ar: 'جودلي',      label_en: 'Godly',        color: '#ff1744', power: 1500, costMult: 9   },
    transcendent: { label_ar: 'ترانسندنت',  label_en: 'Transcendent', color: '#ff9100', power: 2000, costMult: 10  }
};

/* ترتيب التيرات (للـ glow: كل تير من أسطوري وفوق بيتوهج) */
export const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary', 'mythic', 'exotic', 'immortal', 'divine', 'secret', 'godly', 'transcendent'];
export const TOP_GLOW_FROM = 3; // من legendary (index 3) وفوق

/* 98 بطاقة: 43 كويز الموقع كله + أجزاء الأفلام والمسلسلات */
export const CARDS = [
    // ═══ الأفلام العالمية — الأساس ═══
    { id: 'avengers',      name_ar: 'المنتقمون',              name_en: 'Avengers',             image: 'pic/Avengers.jpeg',              rarity: 'divine'       },
    { id: 'squidgame',     name_ar: 'لعبة الحبار',            name_en: 'Squid Game',           image: 'pic/Squid Game.jpg',             rarity: 'godly'        },
    { id: 'spiderman',     name_ar: 'سبايدرمان',              name_en: 'Spider-Man',           image: 'pic/Spider-Man.jpeg',            rarity: 'divine'       },
    { id: 'wednesday',     name_ar: 'وينزداي',                name_en: 'Wednesday',            image: 'pic/Wednesday.jpg',              rarity: 'divine'       },
    { id: 'elharifa',      name_ar: 'الحريفة',                name_en: 'El Harifa',            image: 'pic/Harifa.jpeg',                rarity: 'divine'       },
    { id: 'conjuring',     name_ar: 'الكونجورينج',            name_en: 'The Conjuring',        image: 'pic/The Conjuring.jpg',          rarity: 'secret'       },
    { id: 'avatar',        name_ar: 'أفاتار',                 name_en: 'Avatar',               image: 'pic/Avatar.jpeg',                rarity: 'legendary'    },
    { id: 'venom',         name_ar: 'فينوم',                  name_en: 'Venom',                image: 'pic/Venom.jpeg',                 rarity: 'legendary'    },
    { id: 'traintobusan',  name_ar: 'قطار بوسان',             name_en: 'Train to Busan',       image: 'pic/busan.jpg',                  rarity: 'legendary'    },
    { id: 'scream',        name_ar: 'سكريم',                  name_en: 'Scream',               image: 'pic/Scream.jpeg',                rarity: 'legendary'    },
    { id: 'thenun',        name_ar: 'الراهبة',                name_en: 'The Nun',              image: 'pic/The Nun.jpg',                rarity: 'legendary'    },
    { id: 'elaref',        name_ar: 'العارف',                 name_en: 'El Aref',              image: 'pic/El Aref.jpeg',               rarity: 'legendary'    },
    { id: 'elmamar',       name_ar: 'الممر',                  name_en: 'El Mamar',             image: 'pic/El Mamar.jpeg',              rarity: 'legendary'    },
    { id: 'annabelle',     name_ar: 'أنابيل',                 name_en: 'Annabelle',            image: 'pic/Annabelle.jpg',              rarity: 'epic'         },
    { id: 'fnaf',          name_ar: 'فايف نايتس',             name_en: 'FNAF',                 image: 'pic/FNAF.jpg',                   rarity: 'epic'         },
    { id: 'mazerunner',    name_ar: 'المتاهة',                name_en: 'The Maze Runner',      image: 'pic/Maze Runner.jpeg',           rarity: 'epic'         },
    { id: 'birdsofprey',   name_ar: 'الطيور الجارحة',         name_en: 'Birds of Prey',        image: 'pic/Birds of Prey.jpeg',         rarity: 'epic'         },
    { id: 'fall',          name_ar: 'السقوط',                 name_en: 'Fall',                 image: 'pic/Fall.jpeg',                  rarity: 'epic'         },
    { id: 'elserb',        name_ar: 'السرب',                  name_en: 'El Serb',              image: 'pic/El Serb.jpeg',               rarity: 'epic'         },
    { id: 'eleskandarany', name_ar: 'الإسكندراني',            name_en: 'El Eskandarany',       image: 'pic/El Eskandarany.jpeg',        rarity: 'epic'         },
    { id: 'rambo',         name_ar: 'رامبو',                  name_en: 'Rambo',                image: 'pic/Rambo.jpg',                  rarity: 'common'       },
    { id: 'rocky',         name_ar: 'روكي الغلابة',           name_en: 'Rocky El Ghalaba',     image: 'pic/Rocky El Ghalaba.jpg',       rarity: 'common'       },
    { id: 'shako',         name_ar: 'شقو',                    name_en: 'Shako',                image: 'pic/Shako.jpeg',                 rarity: 'common'       },
    { id: 'tag',           name_ar: 'تاج',                    name_en: 'Tag',                  image: 'pic/Tag.jpg',                    rarity: 'common'       },
    { id: 'bahebak',       name_ar: 'بحبك',                   name_en: 'Bahebak',              image: 'pic/Bahebak.jpg',                rarity: 'common'       },

    // ═══ الأفلام المصرية الناقصة (كويزات موجودة في الموقع) ═══
    { id: 'weshxwesh',     name_ar: 'الوش بالوش',             name_en: 'Wesh X Wesh',          image: 'pic/Wesh X Wesh.jpeg',           rarity: 'mythic'       },
    { id: 'blueelephant',  name_ar: 'الفيل الأزرق',           name_en: 'The Blue Elephant',    image: 'pic/Blue Elephant.jpg',          rarity: 'secret'       },
    { id: 'fasel',         name_ar: 'فاصل',                   name_en: 'Fasel',                image: 'pic/Fasel.jpg',                  rarity: 'mythic'       },
    { id: 'elshater',      name_ar: 'الشاطر',                 name_en: 'El Shater',            image: 'pic/El Shater.jpeg',             rarity: 'epic'         },
    { id: 'elmashroax',    name_ar: 'المشروع إكس',            name_en: 'El Mashroa X',         image: 'pic/El Mashroa X.jpg',           rarity: 'mythic'       },
    { id: 'beitelruby',    name_ar: 'بيت الروبي',             name_en: 'Beit El Ruby',         image: 'pic/Beit El Ruby.jpeg',          rarity: 'epic'         },
    { id: 'barshama',      name_ar: 'برشامة',                 name_en: 'Barshama',             image: 'pic/Barshama.jpeg',              rarity: 'rare'         },
    { id: 'akhyfok',       name_ar: 'أخي فوق الشجرة',         name_en: 'Akhy Fok El Shagara',  image: 'pic/Akhy Fok El Shagara.jpeg',   rarity: 'epic'         },
    { id: 'ahmedwaahmed',  name_ar: 'أحمد وأحمد',             name_en: 'Ahmed Wa Ahmed',       image: 'pic/Ahmed Wa Ahmed.jpeg',        rarity: 'common'       },
    { id: 'nadielregal',   name_ar: 'نادي الرجال السري',      name_en: 'Nadi El Regal',        image: 'pic/Nadi El Regal.jpg',          rarity: 'epic'         },
    { id: 'misterx',       name_ar: 'مستر إكس',               name_en: 'Mister X',             image: 'pic/Mister X.jpeg',              rarity: 'mythic'       },
    { id: 'meratyx',       name_ar: 'مراتي إكس',              name_en: 'Meraty X',             image: 'pic/Meraty X.jpg',               rarity: 'epic'         },
    { id: 'meratywzegty',  name_ar: 'مراتي وزوجتي',           name_en: 'Meraty W Zegty',       image: 'pic/Meraty W Zegty.jpeg',        rarity: 'common'       },
    { id: 'knivesout',     name_ar: 'سكاكين حادة',            name_en: 'Knives Out',           image: 'pic/Knives Out.jpeg',            rarity: 'secret'       },
    { id: 'restart',       name_ar: 'ريستارت',                name_en: 'Restart',              image: 'pic/Restart.jpg',                rarity: 'common'       },
    { id: 'folelseen',     name_ar: 'فول السنة',              name_en: 'Fol El Seen',          image: 'pic/Fol El Seen.jpg',            rarity: 'mythic'       },
    { id: 'sikosiko',      name_ar: 'سيكو سيكو',              name_en: 'Siko Siko',            image: 'pic/Siko Siko.jpeg',             rarity: 'rare'         },
    { id: 'shalaby',       name_ar: 'شلبي',                   name_en: 'Shalaby',              image: 'pic/Shalaby.jpeg',               rarity: 'common'       },

    // ═══ أجزاء المنتقمون ═══
    { id: 'avengers1',     name_ar: 'المنتقمون 1',            name_en: 'Avengers (2012)',      image: 'pic/Avengers 1.jpeg',            rarity: 'legendary'    },
    { id: 'avengers2',     name_ar: 'المنتقمون 2: أولترون',   name_en: 'Avengers: Age of Ultron', image: 'pic/Avengers 2.jpeg',         rarity: 'rare'         },
    { id: 'avengers3',     name_ar: 'المنتقمون 3: حرب اللانهاية', name_en: 'Avengers: Infinity War', image: 'pic/Avengers 3.jpeg',     rarity: 'mythic'       },
    { id: 'avengers4',     name_ar: 'المنتقمون 4: نهاية اللعبة', name_en: 'Avengers: Endgame',  image: 'pic/Avengers 4.jpeg',            rarity: 'transcendent' },

    // ═══ أجزاء أفاتار ═══
    { id: 'avatar1',       name_ar: 'أفاتار 1',               name_en: 'Avatar (2009)',        image: 'pic/Avatar 1.jpeg',              rarity: 'legendary'    },
    { id: 'avatar2',       name_ar: 'أفاتار 2: طريق الماء',   name_en: 'Avatar: The Way of Water', image: 'pic/Avatar 2.jpeg',          rarity: 'rare'         },
    { id: 'avatar3',       name_ar: 'أفاتار 3: النار والرماد', name_en: 'Avatar: Fire and Ash', image: 'pic/Avatar 3.jpeg',             rarity: 'rare'         },

    // ═══ الفيل الأزرق ═══
    { id: 'blueelephant1', name_ar: 'الفيل الأزرق 1',         name_en: 'Blue Elephant (2014)', image: 'pic/Blue Elephant 1.jpeg',       rarity: 'rare'         },
    { id: 'blueelephant2', name_ar: 'الفيل الأزرق 2: التحريض', name_en: 'Blue Elephant 2',     image: 'pic/Blue Elephant 2.jpeg',       rarity: 'legendary'    },

    // ═══ قطار بوسان ═══
    { id: 'busan1',        name_ar: 'قطار بوسان 1',           name_en: 'Train to Busan',       image: 'pic/busan1.jpeg',                rarity: 'exotic'       },
    { id: 'busan2',        name_ar: 'شبه الجزيرة (بوسان 2)',  name_en: 'Peninsula',            image: 'pic/busan2.jpeg',                rarity: 'exotic'       },

    // ═══ فايف نايتس ═══
    { id: 'fnaf1',         name_ar: 'فايف نايتس 1',           name_en: 'FNAF (2023)',          image: 'pic/FNAF 1.jpeg',                rarity: 'rare'         },
    { id: 'fnaf2',         name_ar: 'فايف نايتس 2',           name_en: 'FNAF 2',               image: 'pic/FNAF 2.jpeg',                rarity: 'rare'         },

    // ═══ الحريفة ═══
    { id: 'harifa1',       name_ar: 'الحريفة 1',              name_en: 'El Harifa (2021)',     image: 'pic/Harifa 1.jpeg',              rarity: 'epic'         },
    { id: 'harifa2',       name_ar: 'الحريفة 2',              name_en: 'El Harifa 2',          image: 'pic/Harifa 2.jpeg',              rarity: 'mythic'       },

    // ═══ سكاكين حادة ═══
    { id: 'knivesout1',    name_ar: 'سكاكين حادة 1',          name_en: 'Knives Out (2019)',    image: 'pic/Knives Out 1.jpeg',          rarity: 'epic'         },
    { id: 'knivesout2',    name_ar: 'سكاكين حادة 2: زجاج البصل', name_en: 'Glass Onion',       image: 'pic/Knives Out 2.jpeg',          rarity: 'mythic'       },
    { id: 'knivesout3',    name_ar: 'سكاكين حادة 3',          name_en: 'Wake Up Dead Man',     image: 'pic/Knives Out 3.jpeg',          rarity: 'rare'         },

    // ═══ المتاهة ═══
    { id: 'mazerunner1',   name_ar: 'المتاهة 1',              name_en: 'The Maze Runner',      image: 'pic/Maze Runner 1.jpeg',         rarity: 'rare'         },
    { id: 'mazerunner2',   name_ar: 'المتاهة 2: تجارب الجمر', name_en: 'The Scorch Trials',    image: 'pic/Maze Runner 2.jpeg',         rarity: 'rare'         },
    { id: 'mazerunner3',   name_ar: 'المتاهة 3: العلاج المميت', name_en: 'The Death Cure',     image: 'pic/Maze Runner 3.jpeg',         rarity: 'common'       },

    // ═══ رامبو ═══
    { id: 'rambo1',        name_ar: 'رامبو 1: الدم الأول',    name_en: 'First Blood',          image: 'pic/Rambo 1.jpeg',               rarity: 'epic'         },
    { id: 'rambo2',        name_ar: 'رامبو 2',                name_en: 'Rambo: First Blood Part II', image: 'pic/Rambo 2.jpeg',         rarity: 'mythic'       },
    { id: 'rambo3',        name_ar: 'رامبو 3',                name_en: 'Rambo III',            image: 'pic/Rambo 3.jpeg',               rarity: 'common'       },
    { id: 'rambo4',        name_ar: 'رامبو 4',                name_en: 'Rambo (2008)',         image: 'pic/Rambo 4.jpeg',               rarity: 'common'       },
    { id: 'rambo5',        name_ar: 'رامبو 5: آخر دم',        name_en: 'Rambo: Last Blood',    image: 'pic/Rambo 5.jpeg',               rarity: 'immortal'     },

    // ═══ سكريم ═══
    { id: 'scream1',       name_ar: 'سكريم 1',                name_en: 'Scream (1996)',        image: 'pic/Scream 1.jpeg',              rarity: 'common'       },
    { id: 'scream2',       name_ar: 'سكريم 2',                name_en: 'Scream 2',             image: 'pic/Scream 2.jpeg',              rarity: 'common'       },
    { id: 'scream3',       name_ar: 'سكريم 3',                name_en: 'Scream 3',             image: 'pic/Scream 3.jpeg',              rarity: 'common'       },
    { id: 'scream4',       name_ar: 'سكريم 4',                name_en: 'Scream 4',             image: 'pic/Scream 4.jpeg',              rarity: 'common'       },
    { id: 'scream5',       name_ar: 'سكريم 5',                name_en: 'Scream (2022)',        image: 'pic/Scream 5.jpeg',              rarity: 'common'       },
    { id: 'scream6',       name_ar: 'سكريم 6',                name_en: 'Scream VI',            image: 'pic/Scream 6.jpeg',              rarity: 'exotic'       },
    { id: 'scream7',       name_ar: 'سكريم 7',                name_en: 'Scream 7',             image: 'pic/Scream 7.jpeg',              rarity: 'immortal'     },

    // ═══ عائلة سبايدرمان ═══
    { id: 'spiderman1',    name_ar: 'سبايدرمان 1 (توبي)',     name_en: 'Spider-Man (2002)',    image: 'pic/Spider-Man 1.jpeg',          rarity: 'common'       },
    { id: 'spiderman2',    name_ar: 'سبايدرمان 2 (توبي)',     name_en: 'Spider-Man 2',         image: 'pic/Spider-Man 2.jpeg',          rarity: 'exotic'       },
    { id: 'spiderman3',    name_ar: 'سبايدرمان 3 (توبي)',     name_en: 'Spider-Man 3',         image: 'pic/Spider-Man 3.jpeg',          rarity: 'common'       },
    { id: 'amazing1',      name_ar: 'سبايدرمان المذهل',       name_en: 'The Amazing Spider-Man', image: 'pic/The Amazing Spider-Man.jpeg', rarity: 'exotic'    },
    { id: 'amazing2',      name_ar: 'سبايدرمان المذهل 2',     name_en: 'The Amazing Spider-Man 2', image: 'pic/The Amazing Spider-Man 2.jpeg', rarity: 'common' },
    { id: 'homecoming',    name_ar: 'سبايدرمان: العودة للوطن', name_en: 'Spider-Man: Homecoming', image: 'pic/Spider-Man Homecoming.jpeg', rarity: 'exotic'     },
    { id: 'farfromhome',   name_ar: 'سبايدرمان: بعيد عن الوطن', name_en: 'Spider-Man: Far From Home', image: 'pic/Spider-Man Far From Home.jpeg', rarity: 'immortal' },
    { id: 'nwh',           name_ar: 'سبايدرمان: لا طريق للعودة', name_en: 'Spider-Man: No Way Home', image: 'pic/Spider-Man No Way Home.jpeg', rarity: 'godly'    },
    { id: 'brandnewday',   name_ar: 'سبايدرمان: يوم جديد',    name_en: 'Spider-Man: Brand New Day', image: 'pic/Spider-Man Brand New Day.jpeg', rarity: 'immortal' },

    // ═══ لعبة الحبار ═══
    { id: 'squidgame1',    name_ar: 'لعبة الحبار 1',          name_en: 'Squid Game S1',        image: 'pic/Squid Game 1.jpeg',          rarity: 'legendary'    },
    { id: 'squidgame2',    name_ar: 'لعبة الحبار 2',          name_en: 'Squid Game S2',        image: 'pic/Squid Game 2.jpg',           rarity: 'immortal'     },
    { id: 'squidgame3',    name_ar: 'لعبة الحبار 3',          name_en: 'Squid Game S3',        image: 'pic/Squid Game 3.jpg',           rarity: 'divine'       },

    // ═══ الكونجورينج ═══
    { id: 'conjuring1',    name_ar: 'الكونجورينج 1',          name_en: 'The Conjuring (2013)', image: 'pic/The Conjuring 1.jpg',        rarity: 'rare'         },
    { id: 'conjuring2',    name_ar: 'الكونجورينج 2',          name_en: 'The Conjuring 2',      image: 'pic/The Conjuring 2.jpeg',       rarity: 'rare'         },
    { id: 'conjuring3',    name_ar: 'الكونجورينج 3: إجرام الشيطان', name_en: 'The Conjuring: The Devil Made Me Do It', image: 'pic/The Conjuring 3.jpeg', rarity: 'immortal' },

    // ═══ الراهبة ═══
    { id: 'nun1',          name_ar: 'الراهبة 1',              name_en: 'The Nun (2018)',       image: 'pic/The Nun 1.jpeg',             rarity: 'rare'         },
    { id: 'nun2',          name_ar: 'الراهبة 2',              name_en: 'The Nun II',           image: 'pic/The Nun 2.jpeg',             rarity: 'rare'         },

    // ═══ فينوم ═══
    { id: 'venom1',        name_ar: 'فينوم 1',                name_en: 'Venom (2018)',         image: 'pic/Venom 1.jpeg',               rarity: 'rare'         },
    { id: 'venom2',        name_ar: 'فينوم 2: دع فيهم دمك',   name_en: 'Venom: Let There Be Carnage', image: 'pic/Venom 2.jpeg',        rarity: 'rare'         },
    { id: 'venom3',        name_ar: 'فينوم 3: آخر رقصة',      name_en: 'Venom: The Last Dance', image: 'pic/Venom 3.jpeg',              rarity: 'legendary'    },

    // ═══ وينزداي ═══
    { id: 'wednesday1',    name_ar: 'وينزداي 1',              name_en: 'Wednesday S1',         image: 'pic/Wednesday 1.jpg',            rarity: 'rare'         },
    { id: 'wednesday2',    name_ar: 'وينزداي 2',              name_en: 'Wednesday S2',         image: 'pic/Wednesday 2.jpg',            rarity: 'exotic'       },
];

/* ═══ مساعدات مشتركة ═══ */
export const cardById = (id) => CARDS.find(c => c.id === id);

export function cardName(card, lang = 'ar') {
    return lang === 'ar' ? card.name_ar : card.name_en;
}

/* القوة = قوة التير + 15 لكل مستوى */
export function cardPower(cardOrId, lvl = 1) {
    const c = typeof cardOrId === 'string' ? cardById(cardOrId) : cardOrId;
    if (!c) return 0;
    return RARITY[c.rarity].power + ((Math.max(1, lvl) - 1) * 15);
}

/* فلوس الترقية: 500 × المستوى × مضاعف التير (كل ما التير يعلية الترقية أغلى) */
export function upCost(card, lvl) {
    const c = typeof card === 'string' ? cardById(card) : card;
    if (!c) return Infinity;
    return Math.round(500 * Math.max(1, lvl) * (RARITY[c.rarity].costMult || 1));
}

/* اختيار موزون من التيرات — weights: { tierKey: weight } */
export function pickWeighted(weights) {
    const entries = Object.entries(weights);
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let roll = Math.random() * total;
    for (const [tier, w] of entries) {
        roll -= w;
        if (roll < 0) {
            const pool = CARDS.filter(c => c.rarity === tier);
            if (!pool.length) break;
            return pool[Math.floor(Math.random() * pool.length)].id;
        }
    }
    return CARDS[0].id;
}

/* فرص شراء بطاقة عشوائية (2000 عملة) — مجموع 100% */
export const BUY_ODDS = {
    common: 45, rare: 25, epic: 13, legendary: 7, mythic: 4,
    exotic: 2.5, immortal: 1.5, divine: 0.8, secret: 0.6, godly: 0.4, transcendent: 0.2
};
export const randomCardId = () => pickWeighted(BUY_ODDS);

/* فرص الحزمة الترحيبية (3 بطاقات مجانية) — مجموع 100% */
export const WELCOME_ODDS = {
    common: 50, rare: 27, epic: 12, legendary: 6, mythic: 3,
    exotic: 1, immortal: 0.6, divine: 0.25, secret: 0.1, godly: 0.04, transcendent: 0.01
};
