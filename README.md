Projet : L3D Studio

Remise en service et modernisation d’un L3D Cube 8×8×8 (512 LED RGB) de Looking Glass, piloté par un Particle Photon.

Application déployée :

* GitHub Pages : https://karlos-fr.github.io/l3d-studio/

L’objectif est de développer une application TypeScript moderne permettant de contrôler le cube : choix des animations, couleurs, vitesse, luminosité, paramètres, etc.

Dans un premier temps, l’application remplacera l’ancienne app Android Spark Pixels et pilotera le firmware existant SparkPixelsMega, qui contient déjà de nombreuses animations. À terme, le firmware pourra être modifié/forké pour ajouter une API locale et supprimer la dépendance au Particle Cloud.

Ressources :

* Spark Pixels : https://github.com/sparcules/Spark_Pixels
* Firmware L3D SparkPixelsMega : https://github.com/sparcules/Spark_Pixels/tree/master/Firmware/Neopixel_Library/SparkPixels_L3D_Cube
* App Android Spark Pixels : https://play.google.com/store/apps/details?id=kc.spark.pixels.android

Sécurité :

* Le mot de passe Particle est transmis uniquement au login pour obtenir un token.
* Le mot de passe Particle ne doit pas être stocké ni commité.
* Le token Particle donne accès au compte Particle et doit rester privé.
