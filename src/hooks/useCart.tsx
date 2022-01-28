import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => Promise<void>;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const storedCart = [...cart];

      const productAlreadyExists = storedCart.find(product => product.id === productId);

      const stock = await api.get(`stock/${productId}`);
      const { amount } = stock.data;

      const currentAmountProduct = productAlreadyExists ? productAlreadyExists.amount : 0;
      const newAmountProduct = currentAmountProduct + 1;

      if(newAmountProduct > amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if(productAlreadyExists) {
        productAlreadyExists.amount = newAmountProduct;
      } else {
        const product = await api.get(`products/${productId}`);
        
        const newProduct = {
          ...product.data,
          amount: 1
        };

        storedCart.push(newProduct);
      }

      setCart(storedCart);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(storedCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const storedCart = [...cart];

      const productIndex = storedCart.findIndex(product => product.id === productId);

      if(productIndex >= 0){
        storedCart.splice(productIndex, 1);

        setCart(storedCart);

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(storedCart));
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0) {
        return;
      }

      const storedCart = [...cart];

      const product = storedCart.find(product => product.id === productId);

      const stock = await api.get(`stock/${productId}`);
      const amountStock = stock.data.amount;

      if(amount > amountStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if(product) {
        product.amount = amount;
      }

      setCart(storedCart);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(storedCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
