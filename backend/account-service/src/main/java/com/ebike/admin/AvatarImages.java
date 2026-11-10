package com.ebike.admin;

import java.io.ByteArrayInputStream;
import java.util.Base64;
import javax.imageio.ImageIO;

final class AvatarImages {
    private AvatarImages(){}
    static String validate(String value){
        if(value.isEmpty())return "";
        if(value.length()>180000||!value.matches("^data:image/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$"))throw new IllegalArgumentException("头像格式无效，请重新选择图片");
        try{
            byte[] bytes=Base64.getDecoder().decode(value.substring(value.indexOf(',')+1));
            if(bytes.length>131072)throw new IllegalArgumentException("头像过大，请重新上传压缩后的图片");
            try(var input=ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))){
                var readers=ImageIO.getImageReaders(input);
                if(!readers.hasNext())throw new IllegalArgumentException("头像图片无法读取");
                var reader=readers.next();
                try{
                    reader.setInput(input,true,true);
                    String format=reader.getFormatName();
                    if(!(value.startsWith("data:image/png;")?format.equalsIgnoreCase("png"):format.equalsIgnoreCase("jpeg")))throw new IllegalArgumentException("头像图片格式不匹配");
                    int width=reader.getWidth(0),height=reader.getHeight(0);
                    if(width<1||height<1||width>512||height>512)throw new IllegalArgumentException("头像尺寸不能超过512像素");
                    if(reader.read(0)==null)throw new IllegalArgumentException("头像图片无法读取");
                }finally{reader.dispose();}
            }
            return value;
        }catch(java.io.IOException e){throw new IllegalArgumentException("头像图片无法读取，请重新选择图片");}
    }
}
