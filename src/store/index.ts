import type { Http } from "../http.ts";
import { StoreProducts } from "./products.ts";
import {
  StoreAccount,
  StoreBoards,
  StoreCarts,
  StoreClassifications,
  StoreHome,
  StoreOrders,
  StoreWishlists,
} from "./misc.ts";

export class Store {
  readonly products: StoreProducts;
  readonly home: StoreHome;
  readonly carts: StoreCarts;
  readonly wishlists: StoreWishlists;
  readonly orders: StoreOrders;
  readonly classifications: StoreClassifications;
  readonly boards: StoreBoards;
  readonly account: StoreAccount;

  constructor(http: Http) {
    this.products = new StoreProducts(http);
    this.home = new StoreHome(http);
    this.carts = new StoreCarts(http);
    this.wishlists = new StoreWishlists(http);
    this.orders = new StoreOrders(http);
    this.classifications = new StoreClassifications(http);
    this.boards = new StoreBoards(http);
    this.account = new StoreAccount(http);
  }
}

export * from "./products.ts";
export * from "./misc.ts";
