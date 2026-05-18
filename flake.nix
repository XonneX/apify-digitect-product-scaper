{
  description = "Development flake for ...";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-25.11";
  };

  outputs =
    { nixpkgs, ... }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages."${system}";
    in
    {
      devShells."${system}".default = pkgs.mkShellNoCC {
        packages = with pkgs; [
          php85
          php85Packages.composer
        ];

        # shellHook = 
        #   git config --local core.hooksPath .githooks/
        #   mkdir -p .direnv
        #   ln -sfn "${pkgs.php85}/bin/php" .direnv/php
        #   ln -sfn "${pkgs.php85Packages.composer}/bin/composer" .direnv/composer
        # ;

        # Environment Variables
        # ENV_VAR = "";
      };
    };
}

