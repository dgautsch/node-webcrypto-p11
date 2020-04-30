// Core
import * as core from "webcrypto-core";

import { ITemplate, Key, ObjectClass, PrivateKey, PublicKey, SecretKey } from "graphene-pk11";

export interface ITemplatePair {
  privateKey: ITemplate;
  publicKey: ITemplate;
}

export class CryptoKey<T extends Pkcs11KeyAlgorithm = Pkcs11KeyAlgorithm> extends core.CryptoKey {

  public static defaultKeyAlgorithm() {
    const alg: Pkcs11KeyAlgorithm = {
      label: "",
      name: "",
      sensitive: false,
      token: false,
    };
    return alg;
  }

  public static getID(p11Key: Key) {
    let name: string;
    switch (p11Key.class) {
      case ObjectClass.PRIVATE_KEY:
        name = "private";
        break;
      case ObjectClass.PUBLIC_KEY:
        name = "public";
        break;
      case ObjectClass.SECRET_KEY:
        name = "secret";
        break;
      default:
        throw new Error(`Unsupported Object type '${ObjectClass[p11Key.class]}'`);
    }
    return `${name}-${p11Key.handle.toString("hex")}-${p11Key.id.toString("hex")}`;
  }

  public id: string;
  public p11Object: Key | SecretKey | PublicKey | PrivateKey;

  public type: KeyType = "secret";
  public extractable: boolean = false;
  public algorithm: T;
  public usages: KeyUsage[] = [];

  public get key(): Key {
    return this.p11Object.toType<Key>();
  }

  constructor(key: Key, alg: T | KeyAlgorithm) {
    super();
    this.p11Object = key;
    switch (key.class) {
      case ObjectClass.PUBLIC_KEY:
        this.initPublicKey(key.toType<PublicKey>());
        break;
      case ObjectClass.PRIVATE_KEY:
        this.initPrivateKey(key.toType<PrivateKey>());
        break;
      case ObjectClass.SECRET_KEY:
        this.initSecretKey(key.toType<SecretKey>());
        break;
      default:
        throw new core.CryptoError(`Wrong incoming session object '${ObjectClass[key.class]}'`);
    }
    const { name, ...defaultAlg } = CryptoKey.defaultKeyAlgorithm();
    this.algorithm = { ...alg, ...defaultAlg } as any;
    this.id = CryptoKey.getID(key);

    try {
      this.algorithm.label = key.label;
    } catch { /*nothing*/ }
    try {
      this.algorithm.token = key.token;
    } catch { /*nothing*/ }
    try {
      this.algorithm.sensitive = key.get("sensitive");
    } catch { /*nothing*/ }

    this.onAssign();
  }

  public toJSON() {
    return {
      algorithm: this.algorithm,
      type: this.type,
      usages: this.usages,
      extractable: this.extractable,
    };
  }

  protected initPrivateKey(key: PrivateKey) {
    this.p11Object = key;
    this.type = "private";
    try {
      // Yubico throws CKR_ATTRIBUTE_TYPE_INVALID
      this.extractable = key.extractable;
    } catch (e) {
      this.extractable = false;
    }
    this.usages = [];
    if (key.decrypt) {
      this.usages.push("decrypt");
    }
    if (key.derive) {
      this.usages.push("deriveKey");
      this.usages.push("deriveBits");
    }
    if (key.sign) {
      this.usages.push("sign");
    }
    if (key.unwrap) {
      this.usages.push("unwrapKey");
    }
  }

  protected initPublicKey(key: PublicKey) {
    this.p11Object = key;
    this.type = "public";
    this.extractable = true;
    if (key.encrypt) {
      this.usages.push("encrypt");
    }
    if (key.verify) {
      this.usages.push("verify");
    }
    if (key.wrap) {
      this.usages.push("wrapKey");
    }
  }

  protected initSecretKey(key: SecretKey) {
    this.p11Object = key;
    this.type = "secret";
    try {
      // Yubico throws CKR_ATTRIBUTE_TYPE_INVALID
      this.extractable = key.extractable;
    } catch (e) {
      this.extractable = false;
    }
    if (key.sign) {
      this.usages.push("sign");
    }
    if (key.verify) {
      this.usages.push("verify");
    }
    if (key.encrypt) {
      this.usages.push("encrypt");
    }
    if (key.decrypt) {
      this.usages.push("decrypt");
    }
    if (key.wrap) {
      this.usages.push("wrapKey");
    }
    if (key.unwrap) {
      this.usages.push("unwrapKey");
    }
    if (key.derive) {
      this.usages.push("deriveKey");
      this.usages.push("deriveBits");
    }
  }

  protected onAssign() {
    // nothing
  }

}
