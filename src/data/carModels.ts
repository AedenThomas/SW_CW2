export interface CarModel {
  id: string;
  name: string;
  model: string;
  scale: number;
  price?: number;
  offset?: [number, number, number];
}

export const CAR_MODELS: CarModel[] = [
  { id: 'car1', name: 'Classic Car', model: 'car.glb', scale: 0.022 },
  { id: 'car2', name: 'Sports Car', model: 'car2.glb', scale: 0.0564, price: 100 },
  { id: 'car3', name: 'SUV', model: 'car3.glb', scale: 0.0422, price: 250 },
  { id: 'car4', name: 'Truck', model: 'car4.glb', scale: 0.2922, price: 500 },
]; 