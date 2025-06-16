{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = [
    pkgs.nodejs
    pkgs.util-linux  # ← contiene libuuid.so.1
  ];
}
