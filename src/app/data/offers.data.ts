export const WALMART_OFFERS = [
  {
    id: 1,
    product: 'Desodorante Roll On Men Sensitive Protect, 50 ml',
    price: 1999,  // ← Quitar el punto (1999 en vez de 1.999)
    originalPrice: 3890,  // ← Quitar el punto
    discount: 49,  // ← Corregir cálculo: ((3890-1999)/3890)*100 ≈ 49%
    category: 'Cuidado Personal',  // ← Corregir categoría
    validUntil: '2024-12-31',
    image: 'https://i5.walmartimages.cl/asr/df758d30-d57d-4050-ad84-3886a2a8c076.58cdb7d08cda90b0671c874c126703d8.jpeg?null=&odnHeight=612&odnWidth=612&odnBg=FFFFFF'
  },
  {
    id: 2,
    product: 'Queso Mantecoso Trozo, 450 g',
    price: 6750,
    originalPrice: 7790,
    discount: 13,
    category: 'Lácteos y Quesos',  // ← Categoría más específica
    validUntil: '2024-12-25',
    image: 'https://i5.walmartimages.cl/asr/e1b13cb1-177c-46d5-99f3-58f2c3adb7b5.c973b4bef05b39ccce86fd81982b4ee1.jpeg?odnHeight=612&odnWidth=612&odnBg=FFFFFF'
  },
  {
    id: 3,
    product: 'Mantequilla Con Sal, 250 g',
    price: 2650,
    originalPrice: 2990,
    discount: 11,  // ← Corregir cálculo
    category: 'Lácteos y Quesos',
    validUntil: '2024-12-20',
    image: 'https://i5.walmartimages.cl/asr/e411e3bb-f832-41a4-a761-bfc222dbc064.29b9331771ee8849bc481f7366ea1a8a.jpeg?null=&odnHeight=612&odnWidth=612&odnBg=FFFFFF'
  },
  {
    id: 4,
    product: 'Atún Lomitos Agua Lata, Drenado 104 g - Neto 160 g',
    price: 1350,
    originalPrice:0 ,
    discount:0,
    category: 'Conservas y Enlatados',
    validUntil: '2024-12-28',
    image: 'https://i5.walmartimages.cl/asr/2769fd66-3f6c-4364-ab47-62a73e453fbb.0a534e8fe55016eacae2488c36ecef3b.jpeg?null=&odnHeight=612&odnWidth=612&odnBg=FFFFFF'
  },
  {
    id: 5,
    product: 'Vino Tinto Casa Real Carmenere Botella, 750 ml',
    price: 11190,
    originalPrice: 15390,
    discount: 27,  // ← Corregir cálculo
    category: 'Vinos y Licores',  // ← Corregir categoría
    validUntil: '2024-12-15',
    image: 'https://i5.walmartimages.cl/asr/d01c56f9-52c6-41d4-823a-bad86a0c868b.1178763d758de977b1d0255078ed4d86.jpeg?null=&odnHeight=612&odnWidth=612&odnBg=FFFFFF'
  },
  {
    id: 6,
    product: 'Arroz Grado 1 Grano Largo Bolsa, 1 Kg',
    price: 2090,
    originalPrice: 2690,
    discount: 22,  // ← Corregir cálculo
    category: 'Abarrotes',  // ← Categoría correcta
    validUntil: '2024-12-22',
    image: 'https://i5.walmartimages.cl/asr/e40b1575-7215-4302-85c2-1b97c97bf561.cf48bec6637d05653e74d3175c858b32.jpeg?odnHeight=612&odnWidth=612&odnBg=FFFFFF'
  }
];