import {
  productSchema,
  type Product,
  type ProductVariant,
} from '@/types/domain';

// Original fictional tasting notes and inventory for development only.
const notes: Record<
  string,
  { description: string; tags: string[]; levels?: number[] }
> = {
  'product-1': {
    description:
      'М’який світлий лагер із хлібним ароматом солоду та делікатною хмелевою гіркотою. Чистий, сухий післясмак залишає місце для наступного відтінку. Добре поєднується з житніми грінками, горіхами та ніжним сиром.\n\nПодавайте охолодженим, але не крижаним: так солодові ноти розкриються виразніше. Наливайте повільно під кутом, залишаючи трохи місця для піни.',
    tags: ['Хлібні ноти', 'Солод'],
    levels: [2, 2, 1, 2],
  },
  'product-3': {
    description:
      'IPA з цитрусовим ароматом і легкою хвойною нотою. Солодова основа врівноважує хміль, а сухий фініш підкреслює свіжість смаку.',
    tags: ['Цитрус', 'Хвоя'],
    levels: [3, 2, 1, 3],
  },
  'product-4': {
    description:
      'Темний стаут із нотами обсмаженої кави та какао. Оксамитова текстура переходить у стриманий сухий післясмак.',
    tags: ['Кава', 'Какао'],
    levels: [3, 3, 1, 4],
  },
  'product-6': {
    description:
      'Яблучний сидр із легкою кислинкою та ароматом стиглих садових яблук. Освіжальний фруктовий післясмак.',
    tags: ['Яблуко'],
  },
  'product-7': {
    description:
      'Хрусткі житні грінки з легкою часниковою нотою. Виразний хлібний смак пасує до світлого лагера та бурштинового елю.',
    tags: ['Житній хліб', 'Часник'],
  },
  'product-8': {
    description:
      'Лагер у банці з чистим солодовим смаком та квітковим хмелевим ароматом. Помірна гіркота й сухий фініш.',
    tags: ['Солод', 'Квіткові ноти'],
    levels: [3, 2, 1, 3],
  },
  'product-13': {
    description:
      'Насичений подвійний IPA з ароматом грейпфрута та тропічних фруктів. Щільна солодова основа підтримує тривалу хмелеву гіркоту.',
    tags: ['Грейпфрут', 'Тропічні фрукти'],
    levels: [5, 3, 1, 5],
  },
  'product-27': {
    description:
      'Безалкогольний лагер із хлібним ароматом, м’яким солодом і легкою гіркотою. Чистий смак без зайвої солодкості.',
    tags: ['Хлібні ноти'],
    levels: [1, 2, 1, 2],
  },
};

export function enrichProductDetails(product: Product): Product {
  const note = notes[product.id];
  if (!note) return product;
  const sizes =
    product.servingType === 'draft'
      ? [product.volume.value, 1000, 1500]
      : product.category === 'snacks'
        ? [100, 50, 200]
        : [product.volume.value];
  const variants: ProductVariant[] = sizes.map((value, index) => ({
    id: index === 0 ? 'default' : `${value}-${product.volume.unit}`,
    volume: { value, unit: product.volume.unit },
    servingType: product.servingType,
    basePrice: {
      ...product.price,
      amount: Math.round((product.price.amount * value) / product.volume.value),
    },
    ...(product.id === 'product-13'
      ? { oldPrice: { amount: 18500, currency: 'UAH' } }
      : {}),
    availability: product.availability,
    maxQuantity: index === 2 ? 4 : 12,
    ...(index === 0
      ? {}
      : {
          storeOffers: product.storeIds.map((storeId) => ({
            storeId,
            availability:
              index === 2 && storeId === 'store-1'
                ? ('unavailable' as const)
                : product.availability,
            price: {
              ...product.price,
              amount:
                Math.round(
                  (product.price.amount * value) / product.volume.value,
                ) + (storeId === 'store-2' ? 500 : 0),
            },
          })),
        }),
  }));
  return productSchema.parse({
    ...product,
    description: note.description,
    flavorProfile: note.tags,
    bitternessLevel: note.levels?.[0],
    sweetnessLevel: note.levels?.[1],
    acidityLevel: note.levels?.[2],
    fullnessLevel: note.levels?.[3],
    variants,
    recommendedProductIds:
      product.category === 'snacks'
        ? undefined
        : ['product-7', 'product-29', 'product-31', 'product-32'],
  });
}
