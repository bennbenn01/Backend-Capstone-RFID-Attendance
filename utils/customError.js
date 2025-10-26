export class EarlyResponse extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export class DoesExist extends Error {
  constructor(){
    super('Invalid request');
    this.name = 'DoesExist';

    Object.setPrototypeOf(this, DoesExist.prototype);
    
    this.status = 400;
  }
}

export class EmailSendError extends Error {
  constructor(message){
    super(message);
    this.name = 'EmailSendError';
    this.status = 400;
  }
}