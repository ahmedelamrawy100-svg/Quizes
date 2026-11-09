// أمثلة لإضافتها في questions.js

// 1. True/False
{
  type: 'true_false',
  q_ar: "دمية أنابيل الحقيقية كانت دمية راجدّي آن؟",
  q_en: "The real Annabelle doll was a Raggedy Ann doll?",
  answer: true
}

// 2. Fill in the blank
{
  type: 'fill_blank',
  q_ar: "اسم صاحب الدمية الحقيقية هو ______",
  q_en: "The owner's name is ______",
  answer: "صامويل",
  acceptedAnswers: ["صامويل", "Samuel", "صموئيل"]
}

// 3. Multiple answers
{
  type: 'multiple_answers',
  q_ar: "اختار كل الأجزاء اللي ظهرت فيها أنابيل:",
  q_en: "Select all parts Annabelle appeared in:",
  options_ar: ["الجزء الأول", "الجزء التاني", "الجزء التالت", "الكونجورينج 1"],
  options_en: ["Part 1", "Part 2", "Part 3", "Conjuring 1"],
  answers: [0, 1, 2, 3]
}

// 4. Order events
{
  type: 'order_events',
  q_ar: "رتّب الأحداث دي حسب ترتيبها في الفيلم:",
  q_en: "Order these events:",
  events: ["وصلوا البيت الجديد", "الدمية اتحركت", "الكنيسة أخذت الدمية", "النهاية"]
}

// 5. Match pairs (اختياري - مش مطبق بالكامل)
{
  type: 'match_pairs',
  q_ar: "وصّل كل شخصية بالفيلم:",
  q_en: "Match each character with the movie:",
  pairs: [
    { left: "أنابيل", right: "الكونجورينج" },
    { left: "فالاك", right: "الراهبة" }
  ]
}