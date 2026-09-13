import { addIcons } from 'ionicons';
import {
  arrowBack, barcodeOutline, cameraOutline, chatbubbles,
  closeCircleOutline, closeOutline, handLeftOutline, informationCircle,
  location, locationOutline, map, megaphone, mic, micOff, navigate,
  personCircleOutline, phonePortrait, play, pricetag, pricetagOutline,
  pricetagsOutline, reload, restaurant, search, searchOutline, send,
  sparkles, star, sunnyOutline, videocamOutline, volumeHigh, volumeMute,
  warningOutline
} from 'ionicons/icons';

/**
 * Registro único de íconos de la app (Ionic 8 standalone no los carga solo).
 * Se llama una vez desde main.ts. Al usar un ícono nuevo en un template,
 * agregarlo aquí y no en la página.
 */
export function registerAppIcons(): void {
  addIcons({
    'arrow-back': arrowBack,
    'barcode-outline': barcodeOutline,
    'camera-outline': cameraOutline,
    chatbubbles,
    'close-circle-outline': closeCircleOutline,
    'close-outline': closeOutline,
    'hand-left-outline': handLeftOutline,
    'information-circle': informationCircle,
    location,
    'location-outline': locationOutline,
    map,
    megaphone,
    mic,
    'mic-off': micOff,
    navigate,
    'person-circle-outline': personCircleOutline,
    'phone-portrait': phonePortrait,
    play,
    pricetag,
    'pricetag-outline': pricetagOutline,
    'pricetags-outline': pricetagsOutline,
    reload,
    restaurant,
    search,
    'search-outline': searchOutline,
    send,
    sparkles,
    star,
    'sunny-outline': sunnyOutline,
    'videocam-outline': videocamOutline,
    'volume-high': volumeHigh,
    'volume-mute': volumeMute,
    'warning-outline': warningOutline,
  });
}
