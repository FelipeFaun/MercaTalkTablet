import { Injectable } from '@angular/core';

export interface Product {
  id: number;
  name: string;
  brand: string;
  price: number;
  image: string;
  barcode: string;
  category: string;
  inOffer?: boolean;
  offerPrice?: number;
  supermarketLocation?: {
    aisle: string;
    section: string;
    shelf: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ProductsService {
  private mockProducts: Product[] = [
    // LÁCTEOS
    {
      id: 1,
      name: 'Leche Entera',
      brand: 'Soprole',
      price: 1250,
      image: 'https://i5.walmartimages.cl/asr/775df153-9744-4128-ae20-ac1254c4b7ba.41d5a84806e6e592a9abcc656a04f92b.jpeg?odnHeight=612&odnWidth=612&odnBg=FFFFFF',
      barcode: '7801234567890',
      category: 'Lácteos',
      inOffer: true,
      offerPrice: 999,
      supermarketLocation: {
        aisle: 'Pasillo 1',
        section: 'Refrigerados',
        shelf: 'Estante 3'
      }
    },
    {
      id: 2,
      name: 'Leche sin lactosa',
      brand: 'Colun',
      price: 1350,
      image: 'https://i5.walmartimages.cl/asr/71dd0d88-2ad9-4337-8daf-cc7bd4340c7c.b886d3083682f3c8563ac40e747f99cc.jpeg?null=&odnHeight=612&odnWidth=612&odnBg=FFFFFF',
      barcode: '7801234567891',
      category: 'Lácteos',
      inOffer: false,
      supermarketLocation: {
        aisle: 'Pasillo 1',
        section: 'Refrigerados',
        shelf: 'Estante 3'
      }
    },
    {
      id: 3,
      name: 'Yogurt Natural',
      brand: 'Soprole',
      price: 890,
      image: 'https://i5.walmartimages.cl/asr/0a591ad3-0ddd-448b-80d3-1c04341256e7.2634a986cefe28e4fab5f5a710142b83.jpeg?null=&odnHeight=612&odnWidth=612&odnBg=FFFFFF',
      barcode: '7801234567895',
      category: 'Lácteos',
      inOffer: true,
      offerPrice: 690,
      supermarketLocation: {
        aisle: 'Pasillo 1',
        section: 'Refrigerados',
        shelf: 'Estante 2'
      }
    },
    {
      id: 4,
      name: 'Mantequilla',
      brand: 'Soprole',
      price: 2200,
      image: 'https://i5.walmartimages.cl/asr/f45a6ffb-5a56-47e4-b424-a537f45f94e8.d6ee5a25f66b10bdac6bf18a3fc8e250.jpeg?null=&odnHeight=612&odnWidth=612&odnBg=FFFFFF',
      barcode: '7801234567896',
      category: 'Lácteos',
      inOffer: false,
      supermarketLocation: {
        aisle: 'Pasillo 1',
        section: 'Refrigerados',
        shelf: 'Estante 4'
      }
    },

    // ABARROTES
    {
      id: 5,
      name: 'Arroz Grado 1',
      brand: 'Tucapel',
      price: 1850,
      image: 'https://i5.walmartimages.cl/asr/8b6c9a3d-2840-43d9-8a23-e60a2b3cf0d0.0218ffb523bbd604e42ec9aa3cad404b.jpeg?odnHeight=612&odnWidth=612&odnBg=FFFFFF',
      barcode: '7801234567893',
      category: 'Abarrotes',
      inOffer: false,
      supermarketLocation: {
        aisle: 'Pasillo 2',
        section: 'Granos y Cereales',
        shelf: 'Estante 1'
      }
    },
    {
      id: 6,
      name: 'Fideos Spaghetti',
      brand: 'Carozzi',
      price: 1150,
      image: 'https://i5.walmartimages.cl/asr/d72fa23a-1bd4-4c1a-800e-3c4bb995e6be.a961ffb4d3f9fb70d27d61333b26ed33.jpeg?odnHeight=612&odnWidth=612&odnBg=FFFFFF',
      barcode: '7801234567897',
      category: 'Abarrotes',
      inOffer: true,
      offerPrice: 890,
      supermarketLocation: {
        aisle: 'Pasillo 2',
        section: 'Pastas',
        shelf: 'Estante 3'
      }
    },
    {
      id: 7,
      name: 'Harina',
      brand: 'Selecta',
      price: 1350,
      image: 'https://i5.walmartimages.cl/asr/cb4c06b0-3c95-423b-8827-633f72041d45.b7ff86ed6a800395c90407005404fb20.jpeg?odnHeight=612&odnWidth=612&odnBg=FFFFFF',
      barcode: '7801234567898',
      category: 'Abarrotes',
      inOffer: false,
      supermarketLocation: {
        aisle: 'Pasillo 2',
        section: 'Harinas',
        shelf: 'Estante 2'
      }
    },
    {
      id: 8,
      name: 'Azúcar',
      brand: 'Iansa',
      price: 1450,
      image: 'https://i5.walmartimages.cl/asr/55feacf9-a832-494c-a4d1-3f29589cb2d7.1d37b60ef75388237b84ba7911123cb2.jpeg?odnHeight=612&odnWidth=612&odnBg=FFFFFF',
      barcode: '7801234567899',
      category: 'Abarrotes',
      inOffer: true,
      offerPrice: 990,
      supermarketLocation: {
        aisle: 'Pasillo 2',
        section: 'Endulzantes',
        shelf: 'Estante 1'
      }
    },

    // BEBIDAS
    {
      id: 9,
      name: 'Coca-Cola 2L',
      brand: 'Coca-Cola',
      price: 2000,
      image: 'https://i5.walmartimages.cl/asr/d52c8d32-8f11-46e3-a420-c30c41deca13.1822237075c0074d6db3071f8fcd6ba0.jpeg?odnHeight=612&odnWidth=612&odnBg=FFFFFF',
      barcode: '7801234567900',
      category: 'Bebidas',
      inOffer: false,
      supermarketLocation: {
        aisle: 'Pasillo 3',
        section: 'Bebidas',
        shelf: 'Estante 4'
      }
    },
    {
      id: 10,
      name: 'Jugo Naranja',
      brand: 'Andina',
      price: 1200,
      image: 'https://i5.walmartimages.cl/asr/933b9bf8-dd99-4300-8715-220bca14f954.cb9ad23bd9cd4c470e2e72669049dd13.jpeg?null=&odnHeight=612&odnWidth=612&odnBg=FFFFFF',
      barcode: '7801234567901',
      category: 'Bebidas',
      inOffer: true,
      offerPrice: 899,
      supermarketLocation: {
        aisle: 'Pasillo 3',
        section: 'Jugos',
        shelf: 'Estante 2'
      }
    },
    {
      id: 11,
      name: 'Agua Mineral',
      brand: 'Benedictino',
      price: 800,
      image: 'https://i5.walmartimages.cl/asr/6df91956-e891-4e66-822a-369a30f92d93.73f51ba588f08ef9b0f6123d56231325.jpeg?null=&odnHeight=612&odnWidth=612&odnBg=FFFFFF',
      barcode: '7801234567902',
      category: 'Bebidas',
      inOffer: false,
      supermarketLocation: {
        aisle: 'Pasillo 3',
        section: 'Aguas',
        shelf: 'Estante 1'
      }
    },

    // LIMPIEZA
    {
      id: 12,
      name: 'Detergente Líquido',
      brand: 'Drive',
      price: 2850,
      image: 'https://i5.walmartimages.cl/asr/10adf1b3-9c59-45c4-9669-c5921fa01928.a7979cf774a57ef4365093d6f33984b0.jpeg?null=&odnHeight=612&odnWidth=612&odnBg=FFFFFF',
      barcode: '7801234567903',
      category: 'Limpieza',
      inOffer: true,
      offerPrice: 2290,
      supermarketLocation: {
        aisle: 'Pasillo 4',
        section: 'Detergentes',
        shelf: 'Estante 3'
      }
    },
    {
      id: 13,
      name: 'Limpia Vidrios',
      brand: 'Brillo',
      price: 1650,
      image: 'https://i5.walmartimages.cl/asr/1ee8fc0b-8c24-4e0c-9547-f9c8911a7b4b.268811ea3b8eee259c84b99bd830fc18.jpeg?odnHeight=612&odnWidth=612&odnBg=FFFFFF',
      barcode: '7801234567904',
      category: 'Limpieza',
      inOffer: false,
      supermarketLocation: {
        aisle: 'Pasillo 4',
        section: 'Limpieza',
        shelf: 'Estante 2'
      }
    },
    {
      id: 14,
      name: 'Jabón Líquido',
      brand: 'Dove',
      price: 2200,
      image: 'https://i5.walmartimages.cl/asr/261cf00b-3366-4af4-980e-2784c7dce630.8600bc3cd458a1ebc3c0f12400abd961.jpeg?null=&odnHeight=612&odnWidth=612&odnBg=FFFFFF',
      barcode: '7801234567905',
      category: 'Limpieza',
      inOffer: true,
      offerPrice: 1790,
      supermarketLocation: {
        aisle: 'Pasillo 4',
        section: 'Jabones',
        shelf: 'Estante 1'
      }
    },

    // FRUTAS Y VERDURAS
    {
      id: 15,
      name: 'Manzanas',
      brand: 'Nacional',
      price: 1290,
      image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&h=300&fit=crop',
      barcode: '7801234567906',
      category: 'Frutas',
      inOffer: true,
      offerPrice: 990,
      supermarketLocation: {
        aisle: 'Pasillo 5',
        section: 'Frutas',
        shelf: 'Estante 1'
      }
    },
    {
      id: 16,
      name: 'Plátanos',
      brand: 'Nacional',
      price: 890,
      image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=300&fit=crop',
      barcode: '7801234567907',
      category: 'Frutas',
      inOffer: false,
      supermarketLocation: {
        aisle: 'Pasillo 5',
        section: 'Frutas',
        shelf: 'Estante 2'
      }
    },
    {
      id: 17,
      name: 'Tomates',
      brand: 'Nacional',
      price: 1190,
      image: 'https://images.unsplash.com/photo-1546470427-e212d0d553d4?w=400&h=300&fit=crop',
      barcode: '7801234567908',
      category: 'Verduras',
      inOffer: true,
      offerPrice: 890,
      supermarketLocation: {
        aisle: 'Pasillo 5',
        section: 'Verduras',
        shelf: 'Estante 3'
      }
    },

    // CARNES
    {
      id: 18,
      name: 'Pechuga de Pollo',
      brand: 'Super Pollo',
      price: 4890,
      image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&h=300&fit=crop',
      barcode: '7801234567909',
      category: 'Carnes',
      inOffer: false,
      supermarketLocation: {
        aisle: 'Pasillo 6',
        section: 'Carnes Frías',
        shelf: 'Estante 1'
      }
    },
    {
      id: 19,
      name: 'Carne Molida',
      brand: 'Super Vacuno',
      price: 6290,
      image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&h=300&fit=crop',
      barcode: '7801234567910',
      category: 'Carnes',
      inOffer: true,
      offerPrice: 5290,
      supermarketLocation: {
        aisle: 'Pasillo 6',
        section: 'Carnes Frías',
        shelf: 'Estante 2'
      }
    },

    {
      id: 21,
      name: 'Sopa Maggi',
      brand: 'Sopas',
      price: 1500,
      image: 'https://images.openfoodfacts.org/images/products/780/295/000/6612/front_es.22.full.jpg',
      barcode: '7802950006629',
      category: 'Sopas',
      inOffer: true,
      offerPrice: 1200,
      supermarketLocation: {
        aisle: 'Pasillo 6',
        section: 'Sopas',
        shelf: 'Estante 1'
      }
    },

    {
      id: 22,
      name: 'Te Supremo',
      brand: 'Té',
      price: 1200,
      image: 'https://cdn.dimerc.cl/media/catalog/product/cache/1/thumbnail/x600/040ec09b1e35df139433887a97daa66f/c/l/cl_z521700_1.jpg',
      barcode: '7801875032010',
      category: 'Sopas',
      inOffer: false,
      offerPrice: 0,
      supermarketLocation: {
        aisle: 'Té',
        section: 'Té',
        shelf: 'Estante 17'
      }
    },

    // PANADERÍA
    {
      id: 20,
      name: 'Pan Molde',
      brand: 'ideal',
      price: 2250,
      image: 'https://i5.walmartimages.cl/asr/dd0b79f5-1ad7-470a-a682-438089b061de.16f50bbe150c7dc2d3f6cfd9400b100e.jpeg?odnHeight=612&odnWidth=612&odnBg=FFFFFF',
      barcode: '7801234567911',
      category: 'Panadería',
      inOffer: true,
      offerPrice: 1790,
      supermarketLocation: {
        aisle: 'Pasillo 7',
        section: 'Panadería',
        shelf: 'Estante 1'
      }
    }
  ];

  constructor() {}

  // Métodos existentes
  searchProducts(query: string): Product[] {
    if (!query.trim()) return [];
   
    return this.mockProducts.filter(product =>
      product.name.toLowerCase().includes(query.toLowerCase()) ||
      product.brand.toLowerCase().includes(query.toLowerCase()) ||
      product.category.toLowerCase().includes(query.toLowerCase())
    );
  }

  findProductByBarcode(barcode: string): Product | undefined {
    return this.mockProducts.find(product => product.barcode === barcode);
  }

  getAllProducts(): Product[] {
    return this.mockProducts;
  }

  getProductsOnOffer(): Product[] {
    return this.mockProducts.filter(product => product.inOffer);
  }

  getProductsByCategory(category: string): Product[] {
    return this.mockProducts.filter(product =>
      product.category.toLowerCase().includes(category.toLowerCase())
    );
  }

  getProductLocation(productName: string): Product['supermarketLocation'] | null {
    const product = this.mockProducts.find(p =>
      p.name.toLowerCase().includes(productName.toLowerCase())
    );
    return product?.supermarketLocation || null;
  }

  // NUEVO MÉTODO: Obtener productos por categorías
  getCategories(): string[] {
    const categories = this.mockProducts.map(product => product.category);
    return [...new Set(categories)]; // Elimina duplicados
  }

  // NUEVO MÉTODO: Buscar productos similares
  getSimilarProducts(productId: number): Product[] {
    const product = this.mockProducts.find(p => p.id === productId);
    if (!product) return [];
    
    return this.mockProducts.filter(p => 
      p.category === product.category && 
      p.id !== productId
    ).slice(0, 4); // Máximo 4 productos similares
  }
}