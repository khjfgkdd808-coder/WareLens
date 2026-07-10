# core/config.py
import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    # 서버 설정
    server_host: str = Field(default="0.0.0.0")
    server_port: int = Field(default=8002)
    
    # 경로 설정 (절대 경로로 관리하여 sys.path.append 방지)
    base_dir: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    model_dir: str = os.path.join(base_dir, "models")
    pose_model_path: str = os.path.join(model_dir, "analyzer_pose_heavy.task")
    catvton_repo_dir: str = os.path.join(base_dir, "CatVTON")
    
    # 모델 추론 및 해상도 설정
    target_width: int = Field(default=768)
    target_height: int = Field(default=1024)
    inference_steps: int = Field(default=40)
    guidance_scale: float = Field(default=2.9)
    
    # 하드웨어 설정
    device: str = Field(default="cuda")

    model_config = SettingsConfigDict(
        env_file=".env",
        protected_namespaces=()  # 💡 Pydantic에게 "model_ 접두사를 써도 경고 띄우지 마!" 라고 알려주는 마법의 옵션입니다.
    )

settings = Settings()