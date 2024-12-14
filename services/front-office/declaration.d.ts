/// <reference types="stylus" />

declare module '*.module.styl' {
  const styles: {[className: string]: string}
  export = styles
}
