import { Component, OnInit, OnDestroy } from '@angular/core';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, 
  IonList, IonItem, IonLabel, IonIcon,
  IonButton, IonTextarea, IonSpinner
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  chatbubbles, pricetag, location, 
  megaphone, restaurant, phonePortrait,
  personCircleOutline, sparkles, star,
  send, arrowBack, mic, micOff,
  volumeHigh, volumeMute, play, reload,
  informationCircle
} from 'ionicons/icons';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { ChatService, ApiResponse } from '../services/chat.service';
import { ProductsService, Product } from '../services/products';
import { RecipesService, Recipe } from '../services/recipes.service';
import { OffersService, Offer } from '../services/offers.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, 
    IonList, IonItem, IonLabel, IonIcon,
    IonButton, IonTextarea, IonSpinner,
    FormsModule,
    CommonModule
  ]
})
export class HomePage implements OnInit, OnDestroy {
  currentAvatar = 'assets/images/liderin.png';
  chatMessage = "¡Hola! Soy Liderín, tu asistente virtual del Supermercado Líder. ¿En qué puedo ayudarte hoy?";
  showChatInput = false;

  // PROPIEDADES PARA CONTROLAR CONVERSACIÓN
  isInConversation = false;
  userMessage: string = '';
  isLoading: boolean = false;

  // PROPIEDADES PARA TEXTO A VOZ
  isListening = false;
  isSpeaking = false;
  speechSupported = false;
  isMuted = false; // 🆕 NUEVA PROPIEDAD PARA SILENCIAR

  constructor(
    private router: Router,
    private chatService: ChatService,
    private productsService: ProductsService,
    private recipesService: RecipesService,
    private offersService: OffersService
  ) {
    addIcons({
      chatbubbles,
      pricetag,
      location,
      megaphone,
      restaurant,
      'phone-portrait': phonePortrait,
      'person-circle-outline': personCircleOutline,
      sparkles,
      star,
      send,
      'arrow-back': arrowBack,
      mic,
      'mic-off': micOff,
      'volume-high': volumeHigh,
      'volume-mute': volumeMute,
      play,
      reload,
      'information-circle': informationCircle
    });
  }

  ngOnInit() {
    this.checkSpeechSupport();
  }

  ngOnDestroy() {
    this.stopSpeaking();
    this.stopListening();
  }

  // 🆕 TOGGLE PARA SILENCIAR
  toggleMute() {
    this.isMuted = !this.isMuted;
    
    if (this.isMuted && this.isSpeaking) {
      this.stopSpeaking();
    }
    
    // Guardar preferencia en localStorage
    localStorage.setItem('liderin_muted', this.isMuted.toString());
  }

  // Cargar preferencia de mute al inicializar
  private loadMutePreference() {
    const savedMute = localStorage.getItem('liderin_muted');
    if (savedMute) {
      this.isMuted = savedMute === 'true';
    }
  }

  // VERIFICAR SOPORTE DE VOZ (actualizado)
  private checkSpeechSupport() {
    // Verificar Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.speechSupported = !!SpeechRecognition && !!navigator.mediaDevices;
    
    // Cargar preferencia de mute
    this.loadMutePreference();
    
    if (!this.speechSupported) {
      console.warn('Speech recognition no está soportado en este navegador');
    } else {
      console.log('Speech recognition soportado');
    }
  }

  // INICIAR RECONOCIMIENTO DE VOZ
  async startListening() {
    if (!this.speechSupported || this.isListening) return;

    try {
      // 1. Primero solicitar permiso del micrófono
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        
        // Detener el stream inmediatamente (solo necesitamos el permiso)
        stream.getTracks().forEach(track => track.stop());
      } catch (mediaError) {
        console.error('Permiso de micrófono denegado:', mediaError);
        alert('Por favor permite el acceso al micrófono para usar el reconocimiento de voz.');
        return;
      }

      this.isListening = true;
      
      // 2. Usar Web Speech API
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.lang = 'es-CL';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      
      recognition.onstart = () => {
        console.log('Reconocimiento de voz iniciado');
      };
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        console.log('Texto reconocido:', transcript);
        this.userMessage = transcript;
        this.isListening = false;
      };
      
      recognition.onerror = (event: any) => {
        console.error('Error en reconocimiento de voz:', event.error);
        this.isListening = false;
        
        if (event.error === 'not-allowed') {
          alert('Permiso de micrófono denegado. Por favor habilita el micrófono en la configuración de tu navegador.');
        }
      };
      
      recognition.onend = () => {
        this.isListening = false;
      };
      
      recognition.start();
      
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      this.isListening = false;
    }
  }

  // DETENER RECONOCIMIENTO DE VOZ
  stopListening() {
    this.isListening = false;
  }

  // TOGGLE DE MICRÓFONO
  async toggleListening() {
    if (this.isListening) {
      this.stopListening();
    } else {
      await this.startListening();
    }
  }

  // REPRODUCIR TEXTO COMO VOZ (actualizado con mute)
  async speakText(text: string) {
    if (this.isSpeaking || this.isMuted) {
      this.stopSpeaking();
      return;
    }

    try {
      this.isSpeaking = true;
      
      // Limpiar texto para voz (remover emojis y formato)
      const cleanText = this.cleanTextForSpeech(text);
      
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'es-CL';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      utterance.onend = () => {
        this.isSpeaking = false;
      };
      
      utterance.onerror = (event) => {
        console.error('Error en texto a voz:', event);
        this.isSpeaking = false;
      };
      
      speechSynthesis.speak(utterance);
      
    } catch (error) {
      console.error('Error in text-to-speech:', error);
      this.isSpeaking = false;
    }
  }

  // DETENER VOZ
  stopSpeaking() {
    if (this.isSpeaking) {
      speechSynthesis.cancel();
      this.isSpeaking = false;
    }
  }

  // LIMPIAR TEXTO PARA VOZ
  private cleanTextForSpeech(text: string): string {
    return text
      .replace(/[**\*#`]/g, '') // Remover markdown
      .replace(/[🍳🛒✅❌🔥💰📍🎯📦⏰👩‍🍳📝🥘📋]/g, '') // Remover emojis
      .replace(/\n{3,}/g, '. ') // Reemplazar saltos de línea
      .replace(/\n/g, '. ')
      .replace(/\.\s+\./g, '. ')
      .trim();
  }

  // MÉTODOS PARA CONTROLAR CONVERSACIÓN (actualizado con mute)
  startConversation() {
    this.isInConversation = true;
    this.showChatInput = true;
    this.userMessage = '';
    
    // Mensaje de bienvenida con voz opcional (solo si no está silenciado)
    setTimeout(() => {
      if (!this.isMuted) {
        this.speakText("¡Hola! Soy Liderín. ¿En qué puedo ayudarte hoy? Puedes escribirme o usar el micrófono para hablar conmigo.");
      }
    }, 500);
  }

  endConversation() {
    this.isInConversation = false;
    this.showChatInput = false;
    this.userMessage = '';
    this.stopSpeaking();
    // Restaurar mensaje inicial
    this.chatMessage = "¡Hola! Soy Liderín, tu asistente virtual del Supermercado Líder. ¿En qué puedo ayudarte hoy?";
  }

  // BOTÓN PARA REPETIR VOZ (actualizado con mute)
  repeatVoice() {
    if (this.chatMessage && !this.isSpeaking && !this.isMuted) {
      this.speakText(this.chatMessage);
    }
  }

  // MÉTODOS DE NAVEGACIÓN Y UI
  changeAvatar(avatarPath: string) {
    this.currentAvatar = avatarPath;
  }

  navigateToPriceCheck() {
    this.router.navigate(['/price-check']);
  }

  navigateToStoreLocator() {
    this.router.navigate(['/store-locator']);
  }

  navigateToOffers() {
    this.router.navigate(['/offers']);
  }

  navigateToRecipes() {
    this.router.navigate(['/recipes']);
  }

  navigateToAppDownload() {
    this.router.navigate(['/app-download']);
  }

  // MÉTODO PARA ENVIAR MENSAJE (actualizado con mute)
  async sendMessage() {
    if (!this.userMessage.trim() || this.isLoading) return;

    const userText = this.userMessage.trim();
    this.isLoading = true;

    try {
      const intent = this.analyzeIntent(userText);
      
      let finalMessage = userText;
      let relevantProducts: Product[] = [];
      let relevantRecipes: Recipe[] = [];
      let relevantOffers: Offer[] = [];
      
      // Lógica de búsqueda en los servicios locales
      if (intent.hasProductIntent && (intent.intentType === 'precio' || intent.intentType === 'ubicacion')) {
        relevantProducts = this.findPreciseProducts(
          intent.searchTerm, 
          intent.specificProduct,
          intent.productType,
          intent.intentType
        );
      }
      
      if (intent.hasOfferIntent || intent.intentType === 'ofertas') {
        relevantOffers = this.findRelevantOffers(intent.searchTerm);
      }
      
      if (intent.hasRecipeIntent) {
        relevantRecipes = this.findRelevantRecipes(
          intent.searchTerm,
          intent.recipeType
        );
      }
      
      const shouldAddContext = 
        (intent.intentType === 'precio' && relevantProducts.length > 0) ||
        (intent.intentType === 'ubicacion' && relevantProducts.length > 0) ||
        (intent.intentType === 'ofertas' && relevantOffers.length > 0) ||
        (intent.intentType === 'receta');

      if (shouldAddContext) {
        finalMessage = this.createPreciseContext(
          userText, 
          relevantProducts, 
          relevantRecipes, 
          relevantOffers,
          intent.intentType
        );
      }
      
      // ENVIAR A GEMINI con los datos de los servicios locales
      const response: ApiResponse = await this.chatService.sendMessage(finalMessage, 'normal');
      
      // Procesar respuesta usando datos locales
      if (intent.hasRecipeIntent) {
        const ingredients = this.extractIngredientsFromRecipe(response.reply);
        
        if (ingredients.length > 0) {
          const classifiedProducts = this.classifyProductsByAvailability(ingredients);
          
          const unifiedResponse = this.createUnifiedRecipeResponse(
            response.reply,
            classifiedProducts.available,
            classifiedProducts.unavailable
          );
          
          this.chatMessage = unifiedResponse;
        } else {
          this.chatMessage = this.cleanRecipeText(response.reply);
        }
      } else {
        this.chatMessage = response.reply;
      }

      // REPRODUCIR RESPUESTA CON VOZ (solo si no está silenciado)
      setTimeout(() => {
        if (!this.isMuted) {
          this.speakText(this.chatMessage);
        }
      }, 1000);

    } catch (error) {
      let errorMessage = 'Lo siento, hubo un error. Por favor intenta nuevamente.';
      if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
      }
      this.chatMessage = errorMessage;
    } finally {
      this.isLoading = false;
      this.userMessage = '';
    }
  }

  // MÉTODOS PRIVADOS EXISTENTES
  private findSpecificProduct(message: string, productCategory: string): string {
    const productPatterns: { [key: string]: string[] } = {
      'leche': ['soprole', 'colun', 'loncoleche'],
      'arroz': ['tucapel', 'grado 1'],
      'aceite': ['chef', 'maravilla'],
      'té': ['supremo'],
      'queso': ['mantecoso'],
      'vino': ['carmenere', 'casa real'],
      'mantequilla': ['con sal'],
      'atún': ['lomitos', 'agua']
    };
    
    const patterns = productPatterns[productCategory];
    if (patterns) {
      const found = patterns.find(pattern => message.includes(pattern));
      if (found) {
        return `${found} ${productCategory}`;
      }
    }
    
    return productCategory;
  }

  private findProductType(message: string, productCategory: string): string {
    const typePatterns: { [key: string]: string[] } = {
      'leche': ['entera', 'deslactosada', 'semidescremada', 'descremada'],
      'arroz': ['grado 1', 'integral', 'largo', 'corto'],
      'aceite': ['maravilla', 'girasol', 'oliva']
    };
    
    const patterns = typePatterns[productCategory];
    if (patterns) {
      const found = patterns.find(pattern => message.includes(pattern));
      if (found) {
        return found;
      }
    }
    
    return '';
  }

  private findPreciseProducts(searchTerm: string, specificProduct?: string, productType?: string, intentType?: string): Product[] {
    let products: Product[] = [];
    
    if (specificProduct) {
      products = this.productsService.searchProducts(specificProduct);
    } else {
      products = this.productsService.searchProducts(searchTerm);
    }
    
    if (productType) {
      products = products.filter(product => 
        product.name.toLowerCase().includes(productType) ||
        product.brand.toLowerCase().includes(productType)
      );
    }
    
    return this.applyProductLimits(products, intentType);
  }

  private applyProductLimits(products: Product[], intentType?: string): Product[] {
    if (intentType === 'categoria' || intentType === 'general') {
      return products.slice(0, 3);
    }
    
    if (products.length > 5 && intentType === 'general') {
      return products.slice(0, 3);
    }
    
    return products;
  }

  private findRelevantRecipes(searchTerm: string, recipeType?: string): Recipe[] {
    let recipes: Recipe[] = [];
    
    if (recipeType) {
      recipes = this.recipesService.searchRecipes(recipeType);
    } else if (searchTerm) {
      recipes = this.recipesService.searchRecipes(searchTerm);
    } else {
      recipes = this.recipesService.getEasyRecipes().slice(0, 3);
    }
    
    return recipes.slice(0, 2);
  }

  private findRelevantOffers(searchTerm: string): Offer[] {
    let offers: Offer[] = [];
    
    if (searchTerm) {
      offers = this.offersService.searchOffers(searchTerm);
    } else {
      offers = this.offersService.getBestOffers();
    }
    
    if (offers.length === 0) {
      offers = this.offersService.getAllOffers().slice(0, 3);
    }
    
    return offers.slice(0, 3);
  }

  private classifyProductsByAvailability(ingredientList: string[]): { available: any[], unavailable: any[] } {
    const available = [];
    const unavailable = [];
    const allProducts = this.productsService.getAllProducts();
    
    for (const ingredient of ingredientList) {
      const foundProduct = allProducts.find(product => 
        product.name.toLowerCase().includes(ingredient.toLowerCase()) ||
        product.category.toLowerCase().includes(ingredient.toLowerCase())
      );
      
      if (foundProduct) {
        available.push({
          name: foundProduct.name,
          price: foundProduct.price,
          brand: foundProduct.brand,
          inOffer: foundProduct.inOffer,
          offerPrice: foundProduct.offerPrice
        });
      } else {
        const cleanIngredient = this.cleanIngredientName(ingredient);
        if (cleanIngredient && cleanIngredient.length > 1) {
          unavailable.push({
            name: cleanIngredient,
            status: 'No disponible en inventario'
          });
        }
      }
    }
    
    return { available, unavailable };
  }

  private cleanIngredientName(ingredient: string): string {
    return ingredient
      .replace(/[•\*\d\s](cucharaditas?|cucharadas?|tazas?|gramos?|ml|kg)?\s*de\s+/gi, '')
      .replace(/^\s*\d+\s*/, '')
      .replace(/[•\-\*]/g, '')
      .trim();
  }

  private cleanRecipeText(recipeText: string): string {
    let cleaned = recipeText
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/#{1,6}\s?/g, '')
      .replace(/`(.*?)`/g, '$1')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return cleaned;
  }

  private extractIngredientsFromRecipe(recipeText: string): string[] {
    const cleanedText = this.cleanRecipeText(recipeText);
    
    const ingredientSectionMatch = cleanedText.match(/(ingredientes?:?|para\s+la\s+receta:?)(.*?)(?=preparación|instrucciones|pasos|procedimiento|$)/i);
    
    if (ingredientSectionMatch) {
      const ingredientSection = ingredientSectionMatch[0];
      
      const ingredientPatterns = [
        /•\s*([^•\n]+)/g,
        /-\s*([^\n]+)/g,
        /\*\s*([^\n]+)/g,
        /(\d+[^•\n]*)/g
      ];
      
      for (const pattern of ingredientPatterns) {
        const matches = ingredientSection.match(pattern);
        if (matches && matches.length > 0) {
          return matches
            .map(m => this.cleanIngredientName(m))
            .filter(m => m.length > 2 && !m.includes(':') && !m.match(/^\d+$/))
            .slice(0, 10);
        }
      }
    }
    
    const commonIngredients = [
      'arroz', 'pollo', 'cebolla', 'pimentón', 'caldo', 'arvejas', 'aceite', 
      'sal', 'pimienta', 'colorante', 'ajo', 'zanahoria', 'tomate', 'queso',
      'leche', 'harina', 'mantequilla', 'huevo', 'carne', 'pescado', 'pasta',
      'fideos', 'limón', 'cilantro', 'perejil', 'orégano', 'albahaca'
    ];
    
    const foundIngredients = commonIngredients.filter(ingredient => 
      cleanedText.toLowerCase().includes(ingredient)
    );
    
    return foundIngredients.length > 0 ? foundIngredients : [];
  }

  private createUnifiedRecipeResponse(recipeText: string, availableProducts: any[], unavailableProducts: any[]): string {
    const cleanedRecipe = this.cleanRecipeText(recipeText);
    
    let response = "Receta Completa\n\n";
    response += cleanedRecipe + "\n\n";
    
    if (availableProducts.length > 0) {
      response += "✅ Productos Disponibles en Líder\n";
      availableProducts.forEach(product => {
        response += `• ${product.name} - ${product.brand} - $${product.inOffer ? product.offerPrice : product.price}`;
        if (product.inOffer) response += " 🔥 OFERTA";
        response += "\n";
      });
      response += "\n";
    }
    
    if (unavailableProducts.length > 0) {
      response += "❌ Productos que Necesitas Comprar\n";
      unavailableProducts.forEach(product => {
        response += `• ${product.name}\n`;
      });
    }
    
    return response;
  }

  private analyzeIntent(message: string): { 
    hasProductIntent: boolean;
    hasRecipeIntent: boolean;
    hasOfferIntent: boolean;
    searchTerm: string;
    intentType: 'precio' | 'ubicacion' | 'ofertas' | 'general' | 'categoria' | 'receta';
    specificProduct?: string;
    productType?: string;
    recipeType?: string;
  } {
    const lowerMessage = message.toLowerCase().trim();
    
    const knownProducts = ['leche', 'arroz', 'aceite', 'té', 'atún', 'harina', 'queso', 'vino', 'mantequilla'];
    const priceKeywords = ['precio', 'cuánto', 'vale', 'cuesta', 'valor'];
    const locationKeywords = ['dónde', 'ubicación', 'pasillo', 'estante', 'sección', 'encuentro'];
    const offerKeywords = ['oferta', 'descuento', 'promoción', 'rebaja', 'ofertas', 'barato', 'económico'];
    const categoryKeywords = ['tipos', 'clases', 'variedades', 'categorías'];
    
    const recipeKeywords = ['receta', 'cocinar', 'preparar', 'hacer', 'cocina', 'cómo hacer', 'recetas', 'plato', 'comida', 'preparación'];
    const specificRecipeKeywords = ['quesadilla', 'ensalada', 'marinada', 'pan', 'arroz', 'atún', 'carne', 'mediterránea', 
                                   'lasaña', 'pastel', 'sopa', 'postre', 'torta', 'guiso', 'estofado', 'asado', 'parrilla'];
    
    let hasOfferIntent = offerKeywords.some(keyword => lowerMessage.includes(keyword));
    
    let hasRecipeIntent = false;
    let recipeType = '';
    
    if (recipeKeywords.some(keyword => lowerMessage.includes(keyword))) {
      hasRecipeIntent = true;
      
      const foundRecipe = specificRecipeKeywords.find(recipe => lowerMessage.includes(recipe));
      if (foundRecipe) {
        recipeType = foundRecipe;
      } else {
        if (lowerMessage.includes('atún')) recipeType = 'atún';
        else if (lowerMessage.includes('queso')) recipeType = 'queso';
        else if (lowerMessage.includes('vino')) recipeType = 'marinada';
        else if (lowerMessage.includes('mantequilla')) recipeType = 'pan';
        else if (lowerMessage.includes('arroz')) recipeType = 'arroz';
        else if (lowerMessage.includes('pasta') || lowerMessage.includes('fideos')) recipeType = 'pasta';
        else if (lowerMessage.includes('pollo')) recipeType = 'pollo';
        else if (lowerMessage.includes('pescado')) recipeType = 'pescado';
        else recipeType = 'general';
      }
    }
    
    let foundProduct = '';
    let specificProduct = '';
    let productType = '';
    
    knownProducts.forEach(product => {
      if (lowerMessage.includes(product)) {
        foundProduct = product;
        const productMatch = this.findSpecificProduct(lowerMessage, product);
        if (productMatch) specificProduct = productMatch;
        const typeMatch = this.findProductType(lowerMessage, product);
        if (typeMatch) productType = typeMatch;
      }
    });
    
    let intentType: 'precio' | 'ubicacion' | 'ofertas' | 'general' | 'categoria' | 'receta' = 'general';
    
    if (hasOfferIntent) {
      intentType = 'ofertas';
    } else if (hasRecipeIntent) {
      intentType = 'receta';
    } else if (priceKeywords.some(keyword => lowerMessage.includes(keyword))) {
      intentType = 'precio';
    } else if (locationKeywords.some(keyword => lowerMessage.includes(keyword))) {
      intentType = 'ubicacion';
    } else if (categoryKeywords.some(keyword => lowerMessage.includes(keyword)) || 
               lowerMessage.includes('todas las') || 
               lowerMessage.includes('todos los')) {
      intentType = 'categoria';
    }
    
    return {
      hasProductIntent: !!foundProduct,
      hasRecipeIntent,
      hasOfferIntent,
      searchTerm: foundProduct,
      intentType,
      specificProduct,
      productType,
      recipeType
    };
  }

  private createPreciseContext(userMessage: string, products: Product[], recipes: Recipe[], offers: Offer[], intentType: string): string {
    let context = `Cliente pregunta: "${userMessage}"\n\n`;
    
    if (products.length > 0) {
      const productDetails = products.map(product => {
        const priceInfo = product.inOffer ? 
          `💰 OFERTA: $${product.offerPrice} (Normal: $${product.price})` : 
          `💰 Precio: $${product.price}`;
        
        const locationInfo = product.supermarketLocation ? 
          `📍 ${product.supermarketLocation.aisle}, ${product.supermarketLocation.section}, ${product.supermarketLocation.shelf}` : '';
        
        return `🛒 ${product.name} ${product.brand}\n${priceInfo}\n${locationInfo}`;
      }).join('\n\n');
      
      context += `INFORMACIÓN DE PRODUCTOS LÍDER:\n${productDetails}\n\n`;
    }
    
    if (offers.length > 0) {
      const offerDetails = offers.map(offer => {
        if (offer.discount > 0) {
          return `🔥 OFERTA ESPECIAL\n🛒 ${offer.product}\n💰 Precio original: $${offer.originalPrice} | OFERTA: $${offer.price}\n🎯 Ahorras: $${offer.originalPrice - offer.price} (${offer.discount}% de descuento)\n📦 Categoría: ${offer.category}\n⏰ Válido hasta: ${offer.validUntil}`;
        } else {
          return `🛒 ${offer.product}\n💰 Precio: $${offer.price}\n📦 Categoría: ${offer.category}\n⏰ Disponible hasta: ${offer.validUntil}`;
        }
      }).join('\n\n');
      
      context += `OFERTAS ACTUALES LÍDER:\n${offerDetails}\n\n`;
    }
    
    if (recipes.length > 0) {
      const recipeDetails = recipes.map(recipe => {
        return `🍳 ${recipe.name}\n📝 ${recipe.description}\n⏱️ Tiempo: ${recipe.time} | Dificultad: ${recipe.difficulty}\n🥘 Categoría: ${recipe.category}\n📋 Ingrediente principal: ${recipe.mainIngredient}\n🛒 INGREDIENTES EXACTOS:\n${recipe.ingredients.map(ing => `• ${ing}`).join('\n')}\n👩‍🍳 PASOS EXACTOS:\n${recipe.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}`;
      }).join('\n\n');
      
      context += `RECETAS OFICIALES LÍDER:\n${recipeDetails}\n\n`;
    }
    
    let contextInstruction = '';
    switch (intentType) {
      case 'precio':
        contextInstruction = 'Responde enfocándote SOLO en los precios exactos y ofertas.';
        break;
      case 'ubicacion':
        contextInstruction = 'Responde enfocándote SOLO en las ubicaciones exactas dentro de la tienda.';
        break;
      case 'ofertas':
        contextInstruction = 'Responde destacando SOLO las ofertas actuales. Menciona precios originales, precios de oferta, ahorros y fechas de vencimiento. Sé entusiasta con los descuentos.';
        break;
      case 'categoria':
        contextInstruction = 'Responde mostrando una variedad representativa (máximo 3 productos).';
        break;
      case 'receta':
        contextInstruction = 'Proporciona una receta completa y deliciosa con pasos detallados. Sé entusiasta y amigable en tu explicación. Incluye una sección clara de ingredientes.';
        break;
      default:
        contextInstruction = 'Responde con información balanceada y útil.';
    }
    
    context += `INSTRUCCIÓN: ${contextInstruction}\n\nResponde como Liderín de manera alegre y servicial.`;
    
    return context;
  }
}