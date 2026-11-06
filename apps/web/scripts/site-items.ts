/**
 * "How much is a used X worth?" pages: one page per popular resale item, English only, under /resale-value/<slug>.
 *
 * No fixed prices on purpose: prices move weekly, and eBay data may not be stored or republished (ADR-009). Each page
 * explains what decides the price of that exact item and links into a live check prefilled with the model (/?q=...).
 */
import { PLANS } from '@fliplens/core';
import { esc, type Faq, type Page } from './site-common.js';

type Group = 'consoles' | 'audio' | 'apple' | 'cameras' | 'clothing' | 'shoes';

interface Item {
  slug: string;
  name: string;
  /** Prefill of the check: "Brand Model". */
  q: string;
  group: Group;
  /** Short list of the price drivers for the meta description. */
  short: string;
  lead: string;
  identify: string;
  drivers: string[];
  checks: string[];
  sell: string;
  faq: Faq[];
}

export const ITEMS_PATH = '/resale-value';
export const ITEMS_UPDATED = '2026-11-06';

const GROUPS: Record<Group, { name: string; guide: [string, string] }> = {
  consoles: { name: 'Consoles and handhelds', guide: ['/guides/how-much-is-my-console-worth', 'How much is my console worth?'] },
  audio: { name: 'Headphones', guide: ['/guides/resale-value-headphones', 'Resale value of headphones'] },
  apple: { name: 'Phones and laptops', guide: ['/guides/sell-used-phone-europe', 'Selling a used phone in Europe'] },
  cameras: { name: 'Cameras', guide: ['/guides/resale-value-cameras-lenses', 'Resale value of cameras and lenses'] },
  clothing: { name: 'Branded clothes', guide: ['/guides/resale-value-branded-clothes', 'Resale value of branded clothes'] },
  shoes: { name: 'Shoes and sneakers', guide: ['/guides/sneaker-resale-value', 'Sneaker resale value'] },
};

const ITEMS: Item[] = [
  // ---------- consoles ----------
  {
    slug: 'nintendo-switch-oled',
    name: 'Nintendo Switch OLED',
    q: 'Nintendo Switch OLED',
    group: 'consoles',
    short: 'edition, Joy-Con condition, screen and completeness',
    lead: 'The Switch OLED is one of the most traded consoles on eBay and Vinted. Since the Switch 2 came out in 2025 many more are for sale, so old price guides are out of date: compare current listings only.',
    identify: '<p>The OLED model has a 7-inch screen, a wide adjustable stand along the whole back and a dock with a LAN port. The model number on the back is HEG-001. The original Switch (HAC-001) and the Switch Lite (HDH-001) are different products with lower prices, so make sure listings you compare with are the OLED.</p>',
    drivers: [
      '<strong>Edition:</strong> special editions (for example Zelda or Pokémon designs) usually sell above the white and neon versions, but only when the matching dock and Joy-Con are included.',
      '<strong>Joy-Con:</strong> stick drift is the most common fault and lowers the price. Original Joy-Con sell better than third-party ones.',
      '<strong>Screen:</strong> scratches on the OLED screen are hard to hide in photos and cost more than scratches on the back.',
      '<strong>Completeness:</strong> dock, power supply, HDMI cable, Joy-Con grip and straps, and the original box.',
      '<strong>Bundles:</strong> games and cases add less than their shop price. Compare a console alone with consoles alone.',
    ],
    checks: [
      'Joy-Con: move both sticks slowly in a circle in System Settings, Controllers and Sensors, Calibrate Control Sticks.',
      'Screen: look for scratches, dead pixels and lines on a white and a dark background.',
      'Dock: test TV output, the console should charge in the dock.',
      'Account: the seller should have removed their Nintendo Account and reset the console.',
      'Ask whether the console has been banned from online play.',
    ],
    sell: '<p>Sells well on eBay and Vinted, and locally where buyers can test it. Ship in the original box or a padded box: the console and dock are fragile and heavy enough that shipping cost matters for your profit.</p>',
    faq: [
      { q: 'Did the Switch 2 make the Switch OLED worth less?', a: 'More used Switch OLED consoles came on the market after the Switch 2 launch in 2025, which pushed prices down. The OLED still sells steadily because it is cheaper and plays the same Switch games, so check the current price, not last year\'s.' },
      { q: 'Is a Switch OLED without the box worth much less?', a: 'Usually somewhat less, and it is harder to ship safely. The power supply and dock matter more than the box: a console without its dock is clearly worth less.' },
    ],
  },
  {
    slug: 'nintendo-switch-2',
    name: 'Nintendo Switch 2',
    q: 'Nintendo Switch 2',
    group: 'consoles',
    short: 'bundle, game codes, condition and completeness',
    lead: 'The Switch 2 launched in June 2025 and is still current, so used ones trade close to the new price. Small details, such as whether a game code was used, change what it is worth.',
    identify: '<p>The Switch 2 is larger than the original Switch, with a 7.9-inch screen and Joy-Con 2 controllers that attach with magnets. It came alone and in bundles with a game. Check whether a listing includes the game on a cartridge, as an unused download code, or not at all.</p>',
    drivers: [
      '<strong>Bundle:</strong> a console with an unused game code is worth more than one where the code was redeemed. A used code adds nothing.',
      '<strong>Condition:</strong> as a current console, buyers expect it to look nearly new. Scratches and missing parts cost more than on older consoles.',
      '<strong>Completeness:</strong> dock, Joy-Con 2, grip, straps, power supply, cable and box.',
      '<strong>Region:</strong> a Japan-only version sold in Japan is limited to Japanese language and Japanese accounts. Check before buying an import.',
    ],
    checks: [
      'Ask for the receipt: it proves the console is not stolen and may still be under warranty.',
      'Test both Joy-Con 2 for drift and check the magnets hold firmly.',
      'The seller should remove their Nintendo Account and reset the console.',
      'If a game code is included, make sure it has not been redeemed.',
    ],
    sell: '<p>Sells fast on eBay and Vinted. Because it is current, buyers compare with shop prices: a used console only sells well clearly below the new price.</p>',
    faq: [
      { q: 'Can I resell a Switch 2 for more than I paid?', a: 'Only rarely, in short periods when it is out of stock. Most of the time a used Switch 2 sells below the shop price, so resale profit comes from buying cheap, not from scarcity.' },
      { q: 'Does an included game code add value?', a: 'Only if it has not been redeemed. Ask the seller to show the unused code card or the email.' },
    ],
  },
  {
    slug: 'nintendo-switch-lite',
    name: 'Nintendo Switch Lite',
    q: 'Nintendo Switch Lite',
    group: 'consoles',
    short: 'stick drift, screen, colour and charger',
    lead: 'The Switch Lite is cheap to buy and easy to ship, which makes it a popular flip. The catch is that its controllers are built in, so one fault affects the whole console.',
    identify: '<p>The Switch Lite (model HDH-001) is handheld only: no detachable Joy-Con and no TV output. It comes in several colours and some special editions. It is a different product from the Switch and Switch OLED, with a lower price.</p>',
    drivers: [
      '<strong>Stick drift:</strong> the sticks cannot be swapped like Joy-Con, so drift lowers the price a lot.',
      '<strong>Screen:</strong> scratches and pressure marks.',
      '<strong>Colour and edition:</strong> special editions can sell for more than the standard colours.',
      '<strong>Charger:</strong> many are sold without one. It is cheap to replace, but buyers still pay less.',
    ],
    checks: [
      'Calibrate both sticks in System Settings and watch for movement when you let go.',
      'Press every button, including the D-pad and shoulder buttons.',
      'Check the battery: charge it and play for a few minutes.',
      'The seller should remove their Nintendo Account.',
    ],
    sell: '<p>Small and light, so shipping is cheap. Sells well on Vinted and eBay, often with a game or a case. Price the console on its own first, then decide if the extras are worth listing separately.</p>',
    faq: [
      { q: 'Can a Switch Lite with drift still be sold?', a: 'Yes, but for much less, and you must describe the fault. Some buyers repair them, so faulty consoles still find buyers as "for parts or repair".' },
      { q: 'Is the Switch Lite worth less than the Switch?', a: 'Yes. It is a cheaper console without TV output, so used prices are lower as well.' },
    ],
  },
  {
    slug: 'playstation-5',
    name: 'PlayStation 5',
    q: 'Sony PlayStation 5',
    group: 'consoles',
    short: 'model (original, Slim or Pro), disc drive, storage and controller',
    lead: 'There are three PS5 generations, each with and without a disc drive. They look similar in photos but sell for clearly different prices, so knowing the exact model is the most important step.',
    identify: '<p>The model number on the back or the bottom starts with CFI. CFI-10xx and CFI-11xx are the original PS5 (825 GB). CFI-20xx is the PS5 Slim (1 TB) from 2023. CFI-70xx is the PS5 Pro (2 TB) from 2024, which has no disc drive. The Digital Edition has no disc drive; the Slim Digital Edition can get one as an add-on.</p>',
    drivers: [
      '<strong>Model:</strong> Pro, Slim and original are three different price levels. Compare only with the same one.',
      '<strong>Disc drive:</strong> the disc version usually sells above the Digital Edition. A Slim Digital with the add-on drive sits in between.',
      '<strong>Controller:</strong> a DualSense with drift or worn sticks lowers the price.',
      '<strong>Condition:</strong> scratches on the glossy parts, yellowing of the white panels, fan noise.',
      '<strong>Bundles:</strong> games add less than their shop price. Value the console alone first.',
    ],
    checks: [
      'Read the model number (CFI-...) and the storage in Settings, System, System Software.',
      'Start a game: listen for loud fan noise and watch for crashes.',
      'Disc version: insert a disc and check it reads and ejects.',
      'The seller should sign out of PlayStation Network and reset the console.',
      'Test the controller for drift and check all buttons and triggers.',
    ],
    sell: '<p>Sells well on eBay and locally. It is heavy, so ship in a sturdy box and include the shipping cost in your price. Local pickup avoids shipping damage and lets the buyer test it.</p>',
    faq: [
      { q: 'How much less is a PS5 Digital Edition worth?', a: 'It usually sells below the disc version of the same generation. The gap changes over time, so compare with Digital Editions of the same model number only.' },
      { q: 'Why do PS5 prices on eBay vary so much?', a: 'Listings mix original, Slim and Pro, disc and digital, and bundles with games. Filter to your exact model and console-only listings, or let FlipLens do it.' },
    ],
  },
  {
    slug: 'xbox-series-x',
    name: 'Xbox Series X',
    q: 'Microsoft Xbox Series X',
    group: 'consoles',
    short: 'version, storage, controller and condition',
    lead: 'The Xbox Series X is a steady seller, but it is easy to mix up with the cheaper Series S. Here is what decides the price.',
    identify: '<p>The Series X is a tall black box with a disc drive (1 TB). Since 2024 there is also an all-digital white version and a 2 TB edition. The Xbox Series S is much smaller, mostly white, has no disc drive and sells for considerably less.</p>',
    drivers: [
      '<strong>Version:</strong> disc, digital or 2 TB edition.',
      '<strong>Controller:</strong> included, working, no drift.',
      '<strong>Condition:</strong> scratches, dust in the vents, fan noise.',
      '<strong>Completeness:</strong> power cable, HDMI cable, box.',
    ],
    checks: [
      'Confirm it is a Series X, not a Series S.',
      'Start a game and listen to the fan.',
      'Test the disc drive with a disc.',
      'The seller should remove their Microsoft account and reset the console.',
    ],
    sell: '<p>Heavy and bulky, so local pickup or a well-packed parcel. Sells on eBay and local marketplaces; Vinted works too for buyers nearby.</p>',
    faq: [
      { q: 'Is an Xbox Series S worth as much as a Series X?', a: 'No. The Series S is a smaller, cheaper console and resells for clearly less.' },
      { q: 'Does Game Pass affect the resale value?', a: 'No. Subscriptions are tied to the account, not the console. Make sure the seller has removed their account.' },
    ],
  },
  {
    slug: 'steam-deck',
    name: 'Steam Deck',
    q: 'Valve Steam Deck',
    group: 'consoles',
    short: 'LCD or OLED, storage, screen and stick drift',
    lead: 'The Steam Deck has two generations and several storage sizes. The difference between them is bigger than most listings make clear.',
    identify: '<p>The LCD model (2022) came with 64 GB, 256 GB or 512 GB. The OLED model (2023) has a larger, brighter screen and comes with 512 GB or 1 TB. The storage is shown in Settings, System. The OLED is worth noticeably more than the LCD.</p>',
    drivers: [
      '<strong>Generation:</strong> OLED versus LCD.',
      '<strong>Storage:</strong> the 64 GB LCD model sells for least. An upgraded SSD can add a little, but buyers pay mostly for the original specification.',
      '<strong>Sticks and screen:</strong> drift, scratches and dead pixels.',
      '<strong>Case and charger:</strong> the original carrying case and the 45 W charger.',
    ],
    checks: [
      'Check the model and storage in Settings, System.',
      'Test both sticks and the trackpads.',
      'Look for dead pixels on a white background.',
      'The seller should log out of Steam and reset the device.',
    ],
    sell: '<p>Sells well on eBay and Vinted. Ship it in its case inside a padded box.</p>',
    faq: [
      { q: 'Is an LCD Steam Deck still worth buying to resell?', a: 'Yes, if the price is right: it is still in demand as a cheaper handheld PC. Compare only with LCD models of the same storage.' },
      { q: 'Does an SSD upgrade raise the price?', a: 'A little. Most buyers value the original model and storage, so do not expect to recover the cost of the upgrade.' },
    ],
  },
  // ---------- audio ----------
  {
    slug: 'sony-wh-1000xm4',
    name: 'Sony WH-1000XM4',
    q: 'Sony WH-1000XM4',
    group: 'audio',
    short: 'condition of earpads and headband, case, colour and battery',
    lead: 'The WH-1000XM4 is one of the most traded noise-cancelling headphones. It is often confused with the XM3 and XM5, which have different prices.',
    identify: '<p>The model name is printed inside the headband. The XM4 (2020) folds and looks very similar to the XM3. The XM5 (2022) has a smoother design and does not fold; the XM6 followed in 2025. Compare only with the same generation.</p>',
    drivers: [
      '<strong>Earpads and headband:</strong> worn, flaking or dirty earpads lower the price. New pads are cheap and can raise it.',
      '<strong>Case and cable:</strong> the hard case, the audio cable and the airplane adapter.',
      '<strong>Battery:</strong> it should last many hours with noise cancelling on.',
      '<strong>Colour:</strong> black and silver are the most common.',
      '<strong>Fakes:</strong> cheap copies exist. Check the app pairing and the build quality.',
    ],
    checks: [
      'Connect them to the Sony app and check noise cancelling works on both sides.',
      'Listen for crackling and test the touch controls.',
      'Look at the hinges and headband for cracks.',
      'Check the earpads for flaking.',
    ],
    sell: '<p>Light and easy to ship. Sells well on eBay, Vinted and local marketplaces. Clean the earpads and show the case in photos.</p>',
    faq: [
      { q: 'How much less is the XM4 worth than the XM5?', a: 'The XM4 sells below the XM5. The gap moves with new releases, so compare current listings of the same model.' },
      { q: 'Should I replace worn earpads before selling?', a: 'Often yes. Replacement pads are cheap and worn pads put buyers off more than their cost.' },
    ],
  },
  {
    slug: 'sony-wh-1000xm5',
    name: 'Sony WH-1000XM5',
    q: 'Sony WH-1000XM5',
    group: 'audio',
    short: 'condition, case, battery and authenticity',
    lead: 'The WH-1000XM5 kept its value well, but since the XM6 came out in 2025 used prices have moved. Check the current market before buying to resell.',
    identify: '<p>The XM5 does not fold, has a slimmer headband and the model name inside the band. It comes in a flat folding case. The XM4 folds and has a different case.</p>',
    drivers: [
      '<strong>Condition:</strong> the soft finish shows marks; earpads wear.',
      '<strong>Case:</strong> the original case is expected.',
      '<strong>Battery and noise cancelling:</strong> both sides should work.',
      '<strong>Authenticity:</strong> copies exist; buy from sellers who can show the box and receipt.',
    ],
    checks: [
      'Pair with the Sony app and test noise cancelling and the touch panel.',
      'Look at the hinges and sliders.',
      'Ask for the receipt or the box with the serial number.',
    ],
    sell: '<p>Sells well on eBay and Vinted. Photos with the case and a clean headband help.</p>',
    faq: [
      { q: 'Did the XM6 lower the price of the XM5?', a: 'Yes, new generations push used prices of the previous one down. The XM5 still sells steadily, so check the current price.' },
      { q: 'Are XM5 headphones without a case worth less?', a: 'Yes, buyers expect the case. Without it, price it lower.' },
    ],
  },
  {
    slug: 'airpods-pro-2',
    name: 'AirPods Pro 2',
    q: 'Apple AirPods Pro 2',
    group: 'audio',
    short: 'case type, battery, authenticity and Find My lock',
    lead: 'AirPods Pro 2 resell well but are among the most faked products on second-hand marketplaces. Checking authenticity is the first step.',
    identify: '<p>There are two versions of the AirPods Pro 2: with a Lightning case (2022) and with a USB-C case (2023). The AirPods Pro 3 followed in 2025. Connected to an iPhone, Settings shows the exact model and serial number, which you can check on Apple\'s coverage site.</p>',
    drivers: [
      '<strong>Authenticity:</strong> fakes are common. A genuine pair shows the correct serial in Settings and on Apple\'s coverage check.',
      '<strong>Battery:</strong> battery wear lowers the price.',
      '<strong>Case:</strong> USB-C or Lightning, scratches, the speaker and lanyard loop.',
      '<strong>Completeness:</strong> both earbuds, the case and spare tips.',
    ],
    checks: [
      'Pair with an iPhone: check the model, serial and firmware in Settings.',
      'Check the serial number on Apple\'s coverage website.',
      'Make sure they are removed from the seller\'s Apple ID (Find My).',
      'Test noise cancelling and transparency mode on both earbuds.',
    ],
    sell: '<p>Tiny and cheap to ship, sells on eBay and Vinted. Buyers worry about fakes, so show the serial number check and the original box.</p>',
    faq: [
      { q: 'How can I tell if AirPods Pro 2 are fake?', a: 'Pair them with an iPhone and check the serial in Settings and on Apple\'s coverage site. Fakes often show the wrong model, a reused serial or no proper noise cancelling.' },
      { q: 'Can I sell a single AirPod or the case alone?', a: 'Yes, single earbuds and cases sell as replacements, but for much less than a full set.' },
    ],
  },
  // ---------- apple ----------
  {
    slug: 'iphone-13',
    name: 'iPhone 13',
    q: 'Apple iPhone 13',
    group: 'apple',
    short: 'storage, battery health, replaced parts and locks',
    lead: 'The iPhone 13 is a popular used phone in Europe. Storage, battery health and the parts history make the biggest difference to what it sells for.',
    identify: '<p>Settings, General, About shows the model, storage and serial. Make sure to compare with the same model: iPhone 13, 13 mini, 13 Pro and 13 Pro Max are four phones with very different prices.</p>',
    drivers: [
      '<strong>Model and storage:</strong> 128 GB is the most common, larger storage sells for more.',
      '<strong>Battery health:</strong> shown in Settings, Battery. Low battery health lowers the price.',
      '<strong>Replaced parts:</strong> Settings, General, About shows "Parts and service history". A non-genuine screen or battery lowers the price.',
      '<strong>Condition:</strong> screen and frame scratches, cracked back glass.',
      '<strong>Locks:</strong> an iPhone with Activation Lock or a carrier lock is worth much less.',
    ],
    checks: [
      'Find My iPhone must be off and the phone reset to factory settings.',
      'Check battery health and parts history.',
      'Test Face ID, cameras, speakers and charging.',
      'Insert your SIM card to check it is not carrier locked.',
    ],
    sell: '<p>Sells well on eBay and local marketplaces; buyers want photos of the battery health screen. Trade-in offers are faster but usually lower than selling yourself.</p>',
    faq: [
      { q: 'Does battery health affect the price of a used iPhone?', a: 'Yes. Buyers check it first. A low percentage lowers the price, and a replaced battery is fine if it is shown as genuine.' },
      { q: 'Can I sell an iPhone with Activation Lock?', a: 'Not as a working phone. Only the owner can remove it. Never buy one that is still locked.' },
    ],
  },
  {
    slug: 'macbook-air-m1',
    name: 'MacBook Air M1',
    q: 'Apple MacBook Air M1',
    group: 'apple',
    short: 'memory, storage, battery cycles, keyboard layout and locks',
    lead: 'The MacBook Air M1 (2020) is still one of the most sought-after used laptops. In Europe one detail often gets overlooked: the keyboard layout.',
    identify: '<p>The Apple menu, About This Mac shows the chip, memory and serial. The M1 Air has no fan, two USB-C ports and a wedge shape. The M2 Air (2022) is flat, has MagSafe and sells for more.</p>',
    drivers: [
      '<strong>Memory and storage:</strong> 8 GB and 256 GB is the base model; 16 GB or 512 GB sells for more.',
      '<strong>Battery:</strong> the cycle count is shown in System Information, Power.',
      '<strong>Keyboard layout:</strong> a German QWERTZ or French AZERTY keyboard limits buyers in other countries. Sell where the layout is local.',
      '<strong>Condition:</strong> dents, screen coating wear, keyboard shine.',
      '<strong>Charger:</strong> an original charger is expected.',
    ],
    checks: [
      'Find My Mac must be off and the Mac erased (no Activation Lock).',
      'Check memory, storage and battery cycles.',
      'Test every key, the trackpad, the camera and both ports.',
      'Look for marks on the screen from the keyboard.',
    ],
    sell: '<p>Sells well on eBay and local marketplaces. Sell in the country that matches the keyboard layout to reach the most buyers.</p>',
    faq: [
      { q: 'Is a MacBook Air M1 with 8 GB still worth buying to resell?', a: 'Yes, it is the most common version and still in demand. Compare only with the same memory and storage.' },
      { q: 'Does the keyboard layout really change the price?', a: 'Not the value itself, but the number of buyers. A QWERTZ keyboard sells best in Germany and Austria, AZERTY in France and Belgium.' },
    ],
  },
  // ---------- cameras ----------
  {
    slug: 'fujifilm-x100v',
    name: 'Fujifilm X100V',
    q: 'Fujifilm X100V',
    group: 'cameras',
    short: 'condition, finish, accessories and authenticity',
    lead: 'The Fujifilm X100V became famous on social media and is one of the few cameras whose used price stayed high for years. That also makes it a target for scams.',
    identify: '<p>The X100V (2020) has a fixed 23 mm lens, a hybrid viewfinder and a tilting screen. It is often confused with the older X100F and the newer X100VI (2024). The model name is on the top plate.</p>',
    drivers: [
      '<strong>Model:</strong> X100VI, X100V and X100F are three price levels.',
      '<strong>Finish:</strong> silver and black.',
      '<strong>Condition:</strong> lens glass, screen, scratches on the top plate.',
      '<strong>Accessories:</strong> original box, battery, lens cap, adapter ring and filter.',
    ],
    checks: [
      'Take photos and check the lens for haze, scratches and fungus.',
      'Test the viewfinder in both modes and the tilting screen.',
      'Compare the serial on the camera and the box.',
      'Buy only with buyer protection: very low prices are often scams.',
    ],
    sell: '<p>Sells fast on eBay and camera marketplaces. Show sample photos and the serial number to build trust.</p>',
    faq: [
      { q: 'Why is the X100V so expensive used?', a: 'Demand from social media and limited supply kept prices high. Prices have moved since the X100VI launch, so check the current market.' },
      { q: 'Does the X100VI lower the value of the X100V?', a: 'A new model usually lowers the price of the previous one, but demand for the X100V has stayed strong.' },
    ],
  },
  {
    slug: 'sony-a7-iii',
    name: 'Sony A7 III',
    q: 'Sony A7 III',
    group: 'cameras',
    short: 'shutter count, sensor, kit and accessories',
    lead: 'The Sony A7 III is a classic first full-frame camera and sells steadily. Shutter count and sensor condition matter most.',
    identify: '<p>The A7 III (ILCE-7M3) is often listed next to the A7 II, A7 IV and A7R models. The model code is on the bottom. Body only and kits with a lens are different products: compare like with like.</p>',
    drivers: [
      '<strong>Shutter count:</strong> a high count lowers the price.',
      '<strong>Sensor and mount:</strong> scratches on the sensor or a worn mount.',
      '<strong>Kit:</strong> body only versus with a lens; value the lens separately.',
      '<strong>Accessories:</strong> batteries, charger, strap, box.',
    ],
    checks: [
      'Ask for the shutter count or read it from an image file with an online tool.',
      'Look at the sensor with the lens off and take a photo of a white wall at a small aperture.',
      'Test autofocus, stabilisation, card slots and screen.',
    ],
    sell: '<p>Sells on eBay and camera marketplaces. Sell the body and lens separately if the lens is in demand on its own.</p>',
    faq: [
      { q: 'What shutter count is too high for a Sony A7 III?', a: 'There is no hard limit, but a high count lowers the price and buyers ask for it. Mention it in the listing.' },
      { q: 'Is it better to sell the body and lens separately?', a: 'Often yes. Kit lenses are cheap, but good lenses can sell for more on their own.' },
    ],
  },
  // ---------- clothing ----------
  {
    slug: 'polo-ralph-lauren-cable-knit-sweater',
    name: 'Polo Ralph Lauren cable-knit sweater',
    q: 'Polo Ralph Lauren cable-knit sweater',
    group: 'clothing',
    short: 'material, size, colour, condition and authenticity',
    lead: 'Ralph Lauren cable knits are among the best-selling second-hand knitwear on Vinted and eBay. Material and condition matter more than anything else.',
    identify: '<p>The care label inside shows the material: cotton, wool, cashmere or blends. Cashmere and wool sell for more than cotton. The embroidered pony on the chest should be neat and evenly stitched.</p>',
    drivers: [
      '<strong>Material:</strong> cashmere above wool, wool above cotton.',
      '<strong>Size:</strong> common sizes sell fastest; check the label, not the seller\'s description.',
      '<strong>Colour:</strong> classic colours such as navy, cream and green sell well.',
      '<strong>Condition:</strong> pilling, holes and stretched cuffs lower the price.',
      '<strong>Authenticity:</strong> fakes exist; look at the pony, the labels and the stitching.',
    ],
    checks: [
      'Read the care label for the material and size.',
      'Look for moth holes against the light.',
      'Check the cuffs and hem for stretching.',
      'Compare the logo with a genuine one.',
    ],
    sell: '<p>Sells best on Vinted, and on eBay for larger sizes. Photograph the labels and the knit close up.</p>',
    faq: [
      { q: 'Are Ralph Lauren cable knits worth reselling?', a: 'Usually yes, if bought cheaply in good condition. Wool and cashmere ones are the best finds.' },
      { q: 'Do Polo Bear sweaters sell for more?', a: 'Yes, Polo Bear knits are a separate, more sought-after market. See the Polo Bear page.' },
    ],
  },
  {
    slug: 'ralph-lauren-polo-bear-sweater',
    name: 'Ralph Lauren Polo Bear sweater',
    q: 'Polo Ralph Lauren Polo Bear sweater',
    group: 'clothing',
    short: 'design, age, size and condition',
    lead: 'Polo Bear knits are collectible: older and rarer designs sell for far more than a standard Ralph Lauren jumper.',
    identify: '<p>The bear is knitted into the sweater (not printed) and comes in many outfits and themes. The label tells roughly how old it is: vintage pieces from the 1990s are especially sought after. Graphic hoodies and T-shirts with the bear are a cheaper, separate market.</p>',
    drivers: [
      '<strong>Design:</strong> rare and vintage bear designs are worth much more than recent common ones.',
      '<strong>Type:</strong> knitted sweaters above printed hoodies and T-shirts.',
      '<strong>Size:</strong> adult sizes sell above kids\' sizes.',
      '<strong>Condition:</strong> holes, stains and pilling.',
    ],
    checks: [
      'Check the label and the knit quality: fakes exist.',
      'Look for holes and stains, especially around the bear.',
      'Search the exact bear design to see how common it is.',
    ],
    sell: '<p>Sells well on Vinted and eBay. Name the bear design in the title, collectors search for it.</p>',
    faq: [
      { q: 'Why are Polo Bear sweaters so expensive?', a: 'They are collectible: designs change, older ones are scarce, and fans search for specific bears.' },
      { q: 'Is a Polo Bear hoodie worth as much as a knitted sweater?', a: 'No, printed hoodies and T-shirts sell for less than knitted bear sweaters.' },
    ],
  },
  {
    slug: 'supreme-box-logo-hoodie',
    name: 'Supreme Box Logo hoodie',
    q: 'Supreme Box Logo hoodie',
    group: 'clothing',
    short: 'season, colour, size, condition and authenticity',
    lead: 'The Box Logo hoodie is the most valuable everyday Supreme item, and also the most faked. Most other Supreme clothing sells for much less.',
    identify: '<p>The season is printed on the neck or wash tag (for example FW and the year). The box logo is a felt patch with embroidered letters. Other Supreme hoodies with a printed or small logo are a different, cheaper market.</p>',
    drivers: [
      '<strong>Authenticity:</strong> fakes are very common. Without good photos of the tags and stitching, the price drops.',
      '<strong>Season and colour:</strong> some seasons and colours are far more sought after.',
      '<strong>Size:</strong> M and L sell best.',
      '<strong>Condition:</strong> a clean, unfaded logo and no cracks or pills.',
    ],
    checks: [
      'Compare the tags, the logo and the stitching with verified examples.',
      'Check the season on the tag matches the colourway.',
      'Use an authentication service for expensive pieces.',
    ],
    sell: '<p>Sells on eBay and Vinted, and on resale platforms with authentication. Show the tags and logo close up.</p>',
    faq: [
      { q: 'How can I tell if a Supreme Box Logo is fake?', a: 'Check the tags, the font, the logo patch and the stitching against verified photos from the same season. For expensive pieces, use an authentication service.' },
      { q: 'Is all Supreme clothing worth reselling?', a: 'No. Box Logo items and some collaborations keep their value; many other T-shirts and accessories sell for less than people expect.' },
    ],
  },
  {
    slug: 'levis-501',
    name: "Levi's 501 jeans",
    q: "Levi's 501 jeans",
    group: 'clothing',
    short: 'age, origin, size and fades',
    lead: "Most used Levi's 501s are worth little, but some vintage pairs sell for a lot. The tags tell you which one you have.",
    identify: "<p>Look at the red tab, the care tag and the button. A capital \"E\" on the red tab (\"Big E\") marks pairs from before the early 1970s, which are collectible. Pairs made in the USA are generally more sought after than recent ones. The waist and length are on the leather or paper patch at the back.</p>",
    drivers: [
      '<strong>Age and origin:</strong> vintage, Big E and Made in USA pairs above recent ones.',
      '<strong>Size:</strong> common sizes sell faster; vintage sizes run smaller than labelled.',
      '<strong>Fades and wear:</strong> natural fades are valued, but holes in the crotch lower the price.',
      '<strong>Fit:</strong> 501 versus other cuts such as 505 or 550.',
    ],
    checks: [
      'Read the red tab, care tag, button and patch.',
      'Measure the waist and length flat.',
      'Check the crotch and pockets for holes.',
    ],
    sell: "<p>Recent 501s sell on Vinted for small amounts. Vintage pairs sell on eBay and vintage marketplaces: put \"vintage\", the decade and the origin in the title.</p>",
    faq: [
      { q: "How do I know if my Levi's 501 are vintage?", a: "Check the red tab (a capital E means early pairs), the care tag and the country of origin. Older pairs often have no long care tag at all." },
      { q: "Are modern Levi's 501 worth reselling?", a: 'Only when bought cheaply. They sell steadily but for modest amounts.' },
    ],
  },
  {
    slug: 'the-north-face-nuptse',
    name: 'The North Face Nuptse jacket',
    q: 'The North Face Nuptse jacket',
    group: 'clothing',
    short: 'model, size, colour, down condition and authenticity',
    lead: 'The North Face Nuptse puffer sells all winter, and prices rise when it gets cold. Fakes are common, so check before you buy.',
    identify: '<p>The 1996 Retro Nuptse is the classic version. The inside label shows the model and size; genuine jackets have a hologram or a QR code on recent labels, depending on age. Kids\' versions and other puffers (for example Himalayan) are different products.</p>',
    drivers: [
      '<strong>Model:</strong> 1996 Retro Nuptse and special editions above basic puffers.',
      '<strong>Size and colour:</strong> black sells fastest; bright colours vary.',
      '<strong>Down:</strong> lost loft, leaking feathers and flat spots lower the price.',
      '<strong>Authenticity:</strong> check the labels, the logo embroidery and the zips.',
    ],
    checks: [
      'Check labels, zip brand and logo stitching against a genuine jacket.',
      'Squeeze the baffles: they should spring back evenly.',
      'Look for tears, stains and repairs.',
    ],
    sell: '<p>Sells best from October to February on Vinted and eBay. Buy in summer, sell in winter.</p>',
    faq: [
      { q: 'When is the best time to sell a Nuptse jacket?', a: 'In autumn and winter, when demand is highest. Buying out of season is cheaper.' },
      { q: 'How can I spot a fake Nuptse?', a: 'Compare the labels, the logo embroidery, the zips and the stitching with a genuine jacket. Fakes often have uneven logos and thin filling.' },
    ],
  },
  {
    slug: 'carhartt-detroit-jacket',
    name: 'Carhartt Detroit jacket',
    q: 'Carhartt Detroit jacket',
    group: 'clothing',
    short: 'vintage or WIP, wear, size and colour',
    lead: 'Vintage Carhartt workwear is a strong resale category. Worn and faded jackets can sell for more than clean new ones.',
    identify: '<p>Carhartt (the American workwear brand) and Carhartt WIP (its European streetwear line) are different labels. Vintage Detroit jackets have a blanket lining and a corduroy collar. The label style tells roughly how old the jacket is.</p>',
    drivers: [
      '<strong>Line and age:</strong> vintage American Carhartt versus recent WIP pieces.',
      '<strong>Wear:</strong> natural fading is valued, but large tears and stains are not.',
      '<strong>Colour:</strong> brown (Carhartt Brown) and black are classics.',
      '<strong>Size:</strong> work sizes run large.',
    ],
    checks: [
      'Read the label and the country of origin.',
      'Check the lining, cuffs and collar.',
      'Measure the pit-to-pit width.',
    ],
    sell: '<p>Sells on Vinted, eBay and vintage marketplaces. Put "vintage" and the model in the title and show the label.</p>',
    faq: [
      { q: 'Are worn Carhartt jackets worth anything?', a: 'Yes, faded and worn vintage Carhartt is in demand. Heavy damage still lowers the price.' },
      { q: 'Is Carhartt WIP worth as much as vintage Carhartt?', a: 'They are different markets: recent WIP clothing usually sells for less than sought-after vintage pieces.' },
    ],
  },
  {
    slug: 'barbour-wax-jacket',
    name: 'Barbour wax jacket',
    q: 'Barbour wax jacket',
    group: 'clothing',
    short: 'model, size, wax condition and origin',
    lead: 'Barbour wax jackets are a steady seller in the UK and Europe. The model and the state of the wax make the difference.',
    identify: '<p>Classic models include the Bedale, Beaufort and Border. The model name and size are on the inside label. Older jackets made in England with the royal warrant badges are often sought after.</p>',
    drivers: [
      '<strong>Model:</strong> classic models sell best.',
      '<strong>Wax:</strong> a jacket that needs rewaxing sells for less; rewaxing is cheap.',
      '<strong>Size:</strong> sizes run differently by model and age.',
      '<strong>Condition:</strong> tears, worn cuffs, a broken zip or missing lining.',
    ],
    checks: [
      'Read the label for model, size and origin.',
      'Check the zip, the poppers and the corduroy collar.',
      'Smell it: old wax jackets can be musty.',
    ],
    sell: '<p>Sells on eBay, Vinted and Barbour\'s own resale channels. Autumn is the best time to sell.</p>',
    faq: [
      { q: 'Should I rewax a Barbour jacket before selling?', a: 'Often yes. It is cheap and makes the jacket look and sell better.' },
      { q: 'Which Barbour jackets resell best?', a: 'Classic waxed models such as the Bedale, Beaufort and Border, in good condition and common sizes.' },
    ],
  },
  {
    slug: 'patagonia-fleece',
    name: 'Patagonia fleece',
    q: 'Patagonia fleece',
    group: 'clothing',
    short: 'model, age, size and pilling',
    lead: 'Patagonia fleeces are popular second-hand, and vintage ones made in the USA are especially sought after.',
    identify: '<p>Popular models are the Synchilla Snap-T and the Retro-X. The label shows the model and where it was made; older labels look different from recent ones.</p>',
    drivers: [
      '<strong>Model:</strong> Snap-T and Retro-X above basic fleeces.',
      '<strong>Age:</strong> vintage pieces and rare colours above recent ones.',
      '<strong>Condition:</strong> pilling and worn cuffs lower the price.',
      '<strong>Size:</strong> common sizes sell fastest.',
    ],
    checks: [
      'Read the label for model, origin and size.',
      'Check for pilling, stains and broken snaps.',
    ],
    sell: '<p>Sells on Vinted and eBay. Put the model and "vintage" if it applies in the title.</p>',
    faq: [
      { q: 'Are vintage Patagonia fleeces worth more?', a: 'Yes, older pieces and rare colours sell for more than recent fleeces.' },
      { q: 'Does pilling lower the price?', a: 'Yes, but a light de-pilling before selling helps.' },
    ],
  },
  {
    slug: 'stone-island-jacket',
    name: 'Stone Island jacket',
    q: 'Stone Island jacket',
    group: 'clothing',
    short: 'model, material, badge and authenticity',
    lead: 'Stone Island resells well but is one of the most faked clothing brands. The badge and the authenticity code decide whether a buyer trusts your listing.',
    identify: '<p>Every piece has the compass badge on the left sleeve, attached with buttons. Recent pieces have an authenticity label with a code you can check online. Inside labels describe the material and the special treatment of each model.</p>',
    drivers: [
      '<strong>Authenticity:</strong> fakes are very common; a verifiable code adds trust.',
      '<strong>Model and material:</strong> special fabrics and treatments above basic overshirts and sweatshirts.',
      '<strong>Badge:</strong> a missing badge lowers the price.',
      '<strong>Size and condition.</strong>',
    ],
    checks: [
      'Verify the authenticity code online.',
      'Check the badge, buttons and labels.',
      'Look for wear on the cuffs and collar.',
    ],
    sell: '<p>Sells on eBay and Vinted. Photograph the badge, labels and code clearly.</p>',
    faq: [
      { q: 'How do I check if Stone Island is real?', a: 'Use the authenticity code on the label, and check the badge, buttons and labels against genuine pieces.' },
      { q: 'Is a Stone Island jacket without the badge worth less?', a: 'Yes, the badge is part of what buyers pay for.' },
    ],
  },
  // ---------- shoes ----------
  {
    slug: 'nike-dunk-low',
    name: 'Nike Dunk Low',
    q: 'Nike Dunk Low',
    group: 'shoes',
    short: 'colourway, size, condition and authenticity',
    lead: 'Nike Dunk Lows range from common colourways that sell near shop price to limited releases worth much more. The style code tells you which.',
    identify: '<p>The style code (for example DD1391-100) is on the size label inside the shoe and on the box. It identifies the exact colourway. Search the code, not just the name.</p>',
    drivers: [
      '<strong>Colourway:</strong> limited releases far above general releases.',
      '<strong>Size:</strong> common men\'s sizes sell fastest.',
      '<strong>Condition:</strong> creasing, sole wear and yellowing.',
      '<strong>Box and authenticity:</strong> the original box and a matching code.',
    ],
    checks: [
      'Match the style code on the shoe and the box.',
      'Check the stitching, the swoosh and the insole for fakes.',
      'Look at the soles and the heel for wear.',
    ],
    sell: '<p>Sells on Vinted and eBay; limited pairs on authenticated resale platforms. Put the style code in the listing.</p>',
    faq: [
      { q: 'Are Nike Dunk Lows still worth reselling?', a: 'Limited colourways yes. Common ones such as general releases often sell close to or below shop price.' },
      { q: 'Where is the style code on Nike shoes?', a: 'On the size label inside the tongue or on the side wall, and on the box label.' },
    ],
  },
  {
    slug: 'air-jordan-1',
    name: 'Air Jordan 1',
    q: 'Nike Air Jordan 1',
    group: 'shoes',
    short: 'High, Mid or Low, colourway, size and condition',
    lead: 'Air Jordan 1 prices depend first on the cut: High, Mid or Low. A Mid that looks like a famous High sells for a fraction of it.',
    identify: '<p>The style code on the size label identifies the cut and colourway. Highs have more lace holes than Mids, and the Mid has a different collar. Search the code to compare.</p>',
    drivers: [
      '<strong>Cut:</strong> Highs above Lows and Mids.',
      '<strong>Colourway:</strong> limited releases and collaborations far above general releases.',
      '<strong>Condition:</strong> creasing, sole wear, scuffs.',
      '<strong>Authenticity:</strong> fakes are common.',
    ],
    checks: [
      'Match the style code on the shoe and box.',
      'Check the stitching, the logo and the shape against verified pairs.',
      'Look for heel and sole wear.',
    ],
    sell: '<p>Sells on eBay and Vinted; valuable pairs on authenticated platforms.</p>',
    faq: [
      { q: 'Why are Jordan 1 Mids cheaper than Highs?', a: 'They are a general-release line with less demand. The cut matters more than the colourway for most pairs.' },
      { q: 'How do I know if my Jordan 1s are worth a lot?', a: 'Search the style code. Limited releases and collaborations are worth far more than general releases.' },
    ],
  },
  {
    slug: 'dr-martens-1460',
    name: 'Dr. Martens 1460 boots',
    q: 'Dr. Martens 1460 boots',
    group: 'shoes',
    short: 'line, size, wear and origin',
    lead: 'Dr. Martens 1460 boots are an evergreen seller. Boots made in England and special editions sell for more than standard pairs.',
    identify: '<p>The 1460 is the classic 8-eye boot. The size is inside the boot and on the sole. The "Made in England" line is made in the original factory; standard pairs are made elsewhere.</p>',
    drivers: [
      '<strong>Line:</strong> Made in England and special editions above standard.',
      '<strong>Wear:</strong> the soles and heels, creasing, scuffed toes.',
      '<strong>Size:</strong> common sizes sell fastest.',
      '<strong>Colour and leather:</strong> black smooth leather is the most common.',
    ],
    checks: [
      'Look at the soles: heavy heel wear lowers the price.',
      'Check the stitching and the yellow welt.',
      'Read the size and origin inside.',
    ],
    sell: '<p>Sells on Vinted and eBay all year. Clean and polish before photographing.</p>',
    faq: [
      { q: 'Are used Dr. Martens worth anything?', a: 'Yes, they sell steadily. Good condition and Made in England pairs sell best.' },
      { q: 'Does polishing make a difference?', a: 'Yes, clean polished boots look better in photos and sell faster.' },
    ],
  },
];

const cta = (it: Item): string =>
  `<p class="cta"><a class="btn" href="/?q=${esc(encodeURIComponent(it.q))}">Check your ${esc(it.name)}</a><span>Today's price from current eBay listings in the UK and 5 EU countries. Two checks without an account, then ${PLANS.free.monthlyValuations} free a month.</span></p>`;

const ul = (xs: string[]): string => `<ul>${xs.map((x) => `<li>${x}</li>`).join('')}</ul>`;

/** One article per item. */
export const ITEM_PAGES: Page[] = ITEMS.map((it) => {
  const g = GROUPS[it.group];
  const related = ITEMS.filter((o) => o.group === it.group && o.slug !== it.slug).slice(0, 4);
  return {
    path: `${ITEMS_PATH}/${it.slug}`,
    kind: 'article',
    updated: ITEMS_UPDATED,
    crumb: it.name,
    parent: { path: ITEMS_PATH, name: 'Resale values' },
    title: `How much is a used ${it.name} worth? Resale value guide`,
    description: `What a used ${it.name} resells for depends on ${it.short}. How to identify yours, what to check before buying, and today's eBay price in the UK and Europe.`,
    h1: `How much is a used ${it.name} worth?`,
    lead: it.lead,
    cta: cta(it),
    sections: [
      { h2: 'Which one do you have?', html: it.identify },
      { h2: 'What decides the price', html: ul(it.drivers) },
      { h2: 'Check before you buy', html: ul(it.checks) },
      { h2: 'Where it sells best', html: it.sell },
      {
        h2: "Today's price",
        html: `<p>Prices for a used ${esc(it.name)} change every week, so this page gives no fixed numbers. FlipLens reads current eBay listings for the exact model and condition, removes bundles, broken items and other models, and shows a quick-sale, expected and high price, your profit after fees and the most to pay. <a href="/?q=${esc(encodeURIComponent(it.q))}">Check your ${esc(it.name)}</a>.</p><p>More: <a href="${g.guide[0]}">${esc(g.guide[1])}</a>${related.map((o) => ` · <a href="${ITEMS_PATH}/${o.slug}">${esc(o.name)}</a>`).join('')}</p>`,
      },
    ],
    faq: [
      {
        q: `How much is a used ${it.name} worth?`,
        a: `It depends on ${it.short}. Prices change weekly, so check today's value: type "${it.q}" and the condition into FlipLens (fliplens.eu), which compares current eBay listings in the UK and five EU countries and shows the expected sale price and the most worth paying.`,
      },
      ...it.faq,
    ],
  };
});

/** Index of all item pages, grouped. */
export const ITEMS_INDEX: Page = {
  path: ITEMS_PATH,
  kind: 'page',
  updated: ITEMS_UPDATED,
  crumb: 'Resale values',
  title: 'Resale values: how much used consoles, headphones, clothes and sneakers are worth',
  description: 'What decides the resale value of popular second-hand items: Nintendo Switch, PS5, Sony headphones, AirPods, iPhone, Ralph Lauren, Supreme, Levi\'s, Nike and more, with a live price check.',
  h1: 'How much is it worth? Resale values of popular items',
  lead: 'One page per popular second-hand item: how to identify the exact model, what changes the price, what to check before buying, and a one-tap check of today\'s price.',
  sections: (Object.keys(GROUPS) as Group[]).map((g) => ({
    h2: GROUPS[g].name,
    html: `<ul class="guide-list">${ITEMS.filter((it) => it.group === g).map((it) => `<li><a href="${ITEMS_PATH}/${it.slug}">${esc(it.name)}</a><br><span>Depends on ${esc(it.short)}.</span></li>`).join('')}</ul>`,
  })),
};
